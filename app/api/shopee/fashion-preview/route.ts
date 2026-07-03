import { type NextRequest, NextResponse } from "next/server";
import { extractRows } from "@/lib/shopee/csv-parser";
import {
  isFashionByWhitelist,
  isFashionByKeyword,
  isFashionWhitelisted,
} from "@/lib/shopee/fashion-filter";

export const dynamic = "force-dynamic";
// Vercel Hobby ถูก cap ที่ 10s — ใช้งานได้เต็มที่บน local / Vercel Pro
export const maxDuration = 60;

const DEFAULT_LIMIT = 100_000;
const ABSOLUTE_MAX_LIMIT = 200_000;
const MAX_READ_BYTES = 500 * 1024 * 1024;
const TOP_FASHION_COUNT = 100;
const MAX_PRICE_SAMPLES = 20;
const MAX_PRICE_VALIDATION_SAMPLES = 20;

export type FashionProduct = {
  itemId: string;
  title: string;
  category1: string;
  category2: string;
  category3: string;
  salePrice: string;
  originalPrice: string;
  itemSold: string;
  itemRating: string;
  shopRating: string;
  likeCount: string;
  shopName: string;
  isPreferredShop: string;
  isOfficialShop: string;
  imageUrl: string;
  productUrl: string;
};

export type PriceSample = {
  raw: string;
  divBy100: string;
  divBy100000: string;
};

export type PriceValidationSample = {
  title: string;
  salePriceRaw: string;
  category1: string;
  itemSold: string;
  productUrl: string;
  imageUrl: string;
};

export type FashionPreviewResponse = {
  scannedRows: number;
  effectiveLimit: number;
  isPartialScan: boolean;
  notSavedToSupabase: true;
  commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันใน Feed นี้";
  priceAnalysis: {
    samples: PriceSample[];
    priceColumnFound: boolean;
  };
  priceValidationSamples: PriceValidationSample[];
  categoryAnalysis: {
    cat1Summary: { name: string; count: number }[];
    cat2Summary: { name: string; count: number }[];
    cat3Summary: { name: string; count: number }[];
    fashionCandidateCategories: string[];
    fashionByKeyword?: number;
    fashionByWhitelist?: number;
    fashionExcludedCount?: number;
    /** @deprecated ใช้ fashionByWhitelist แทน */
    fashionProductCount?: number;
  };
  fashionProducts: FashionProduct[];
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const feedUrl = process.env.SHOPEE_PRODUCT_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json(
      { error: "ไม่พบการตั้งค่า SHOPEE_PRODUCT_FEED_URL ในระบบ" },
      { status: 503 },
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const effectiveLimit = Math.min(
    ABSOLUTE_MAX_LIMIT,
    Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { Accept: "text/csv, text/plain, application/octet-stream, */*" },
    });
    clearTimeout(timeoutId);
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเชื่อมต่อกับ Shopee Product Feed ได้" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Shopee Product Feed ตอบกลับ HTTP ${response.status} — Feed URL อาจหมดอายุ` },
      { status: 502 },
    );
  }

  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    return NextResponse.json(
      { error: "Feed URL ส่งกลับ HTML แทน CSV — อาจถูก redirect ไปหน้า login หรือ Feed URL หมดอายุ" },
      { status: 422 },
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "ไม่สามารถอ่านข้อมูลจาก Feed ได้" }, { status: 502 });
  }

  const decoder = new TextDecoder("utf-8");
  let remainder = "";
  let firstChunk = true;
  let bytesRead = 0;

  // Parse state
  let headerRow: string[] = [];
  const headerIdx: Record<string, number> = {};
  let dataRowCount = 0;
  let isPartialScan = false;

  // Category tracking
  const cat1Counts = new Map<string, number>();
  const cat2Counts = new Map<string, number>();
  const cat3Counts = new Map<string, number>();
  const fashionCatSet = new Set<string>();

  // Filter stats
  let fashionByKeywordCount = 0;
  let fashionByWhitelistCount = 0;
  let fashionExcludedCount = 0;

  // Price samples
  const priceSamples: PriceSample[] = [];
  let priceColumnFound = false;

  // Price validation samples (first 20 whitelist-matched items)
  const priceValidationSamples: PriceValidationSample[] = [];

  // Top-N fashion products buffer (sorted desc by soldNum, whitelist-filtered)
  type BufferedItem = { product: FashionProduct; soldNum: number };
  const fashionTopBuffer: BufferedItem[] = [];

  function formatPriceSample(raw: string): PriceSample {
    const num = parseFloat(raw);
    if (!isFinite(num)) return { raw, divBy100: "—", divBy100000: "—" };
    return {
      raw,
      divBy100: (num / 100).toFixed(2),
      divBy100000: (num / 100000).toFixed(2),
    };
  }

  function addToTopBuffer(product: FashionProduct, soldNum: number) {
    if (fashionTopBuffer.length < TOP_FASHION_COUNT) {
      fashionTopBuffer.push({ product, soldNum });
      if (fashionTopBuffer.length === TOP_FASHION_COUNT) {
        fashionTopBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    } else {
      const minEntry = fashionTopBuffer[TOP_FASHION_COUNT - 1];
      if (minEntry && soldNum > minEntry.soldNum) {
        fashionTopBuffer[TOP_FASHION_COUNT - 1] = { product, soldNum };
        fashionTopBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    }
  }

  function getField(row: string[], col: string): string {
    const idx = headerIdx[col];
    return idx !== undefined ? (row[idx] ?? "").trim() : "";
  }

  function processRow(row: string[]): boolean {
    if (headerRow.length === 0) {
      headerRow = row.map((h) => h.trim());
      headerRow.forEach((h, i) => {
        headerIdx[h] = i;
      });
      return true;
    }

    if (dataRowCount >= effectiveLimit) return false;
    dataRowCount++;

    const cat1 = getField(row, "global_category1");
    const cat2 = getField(row, "global_category2");
    const cat3 = getField(row, "global_category3");
    const salePrice = getField(row, "sale_price");
    const price = getField(row, "price");
    const itemSold = getField(row, "item_sold");
    const title = getField(row, "title");
    const imageUrl = getField(row, "image_link") || getField(row, "image_link_4");
    const productUrl = getField(row, "product_link");

    // Category counts
    if (cat1) cat1Counts.set(cat1, (cat1Counts.get(cat1) ?? 0) + 1);
    if (cat2) cat2Counts.set(cat2, (cat2Counts.get(cat2) ?? 0) + 1);
    if (cat3) cat3Counts.set(cat3, (cat3Counts.get(cat3) ?? 0) + 1);

    // Price samples (เก็บเฉพาะที่เป็นตัวเลข)
    if (!priceColumnFound && (salePrice || price)) priceColumnFound = true;
    if (priceSamples.length < MAX_PRICE_SAMPLES && salePrice && /^\d+(\.\d+)?$/.test(salePrice.trim())) {
      priceSamples.push(formatPriceSample(salePrice));
    }

    // วิธีเดิม: keyword (นับเพื่อแสดง "ก่อนกรอง")
    const byKeyword =
      isFashionByKeyword(cat1) || isFashionByKeyword(cat2) || isFashionByKeyword(cat3);
    if (byKeyword) fashionByKeywordCount++;

    // วิธีใหม่: whitelist เข้มงวด
    const byWhitelist = isFashionByWhitelist(cat1, cat2, cat3);

    if (byWhitelist) {
      fashionByWhitelistCount++;

      // นับหมวดที่อยู่ใน whitelist จริง
      if (isFashionWhitelisted(cat1)) fashionCatSet.add(cat1);
      if (isFashionWhitelisted(cat2)) fashionCatSet.add(cat2);
      if (cat3 && isFashionWhitelisted(cat3)) fashionCatSet.add(cat3);

      // เก็บตัวอย่างสำหรับยืนยันราคา (20 รายการแรก)
      if (
        priceValidationSamples.length < MAX_PRICE_VALIDATION_SAMPLES &&
        title &&
        salePrice
      ) {
        priceValidationSamples.push({
          title,
          salePriceRaw: salePrice,
          category1: cat1,
          itemSold,
          productUrl,
          imageUrl,
        });
      }

      const soldNum = parseInt(itemSold, 10) || 0;
      addToTopBuffer(
        {
          itemId: getField(row, "itemid"),
          title,
          category1: cat1,
          category2: cat2,
          category3: cat3,
          salePrice,
          originalPrice: price,
          itemSold,
          itemRating: getField(row, "item_rating"),
          shopRating: getField(row, "shop_rating"),
          likeCount: getField(row, "like"),
          shopName: getField(row, "shop_name"),
          isPreferredShop: getField(row, "is_preferred_shop"),
          isOfficialShop: getField(row, "is_official_shop"),
          imageUrl,
          productUrl,
        },
        soldNum,
      );
    } else if (byKeyword) {
      // ถูก keyword แต่ไม่ผ่าน whitelist → นับเป็น excluded
      fashionExcludedCount++;
    }

    return true;
  }

  try {
    while (!isPartialScan) {
      const { done, value } = await reader.read();

      if (done) {
        const { rows } = extractRows(remainder, true);
        for (const row of rows) {
          if (!processRow(row)) {
            isPartialScan = true;
            break;
          }
        }
        break;
      }

      let chunk = decoder.decode(value, { stream: true });
      bytesRead += value.byteLength;

      if (firstChunk) {
        if (chunk.startsWith("﻿")) chunk = chunk.slice(1); // UTF-8 BOM
        firstChunk = false;
      }

      const { rows, remainder: rem } = extractRows(remainder + chunk, false);
      remainder = rem;

      for (const row of rows) {
        if (!processRow(row)) {
          isPartialScan = true;
          break;
        }
      }

      if (bytesRead >= MAX_READ_BYTES) isPartialScan = true;
    }
  } catch {
    // best effort — ส่งคืนข้อมูลที่สะสมได้
  } finally {
    reader.cancel().catch(() => {});
  }

  const cat1Summary = [...cat1Counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const cat2Summary = [...cat2Counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));

  const cat3Summary = [...cat3Counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  const fashionProducts: FashionProduct[] = fashionTopBuffer
    .sort((a, b) => b.soldNum - a.soldNum)
    .map((item) => item.product);

  const result: FashionPreviewResponse = {
    scannedRows: dataRowCount,
    effectiveLimit,
    isPartialScan,
    notSavedToSupabase: true,
    commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันใน Feed นี้",
    priceAnalysis: { samples: priceSamples, priceColumnFound },
    priceValidationSamples,
    categoryAnalysis: {
      cat1Summary,
      cat2Summary,
      cat3Summary,
      fashionCandidateCategories: [...fashionCatSet].sort(),
      fashionByKeyword: fashionByKeywordCount,
      fashionByWhitelist: fashionByWhitelistCount,
      fashionExcludedCount,
    },
    fashionProducts,
  };

  return NextResponse.json(result);
}
