import { NextResponse } from "next/server";
import { extractRows } from "@/lib/shopee/csv-parser";

export const dynamic = "force-dynamic";
// ต้อง Vercel Pro สำหรับ timeout >10s — ใช้งาน local ได้เต็มที่
export const maxDuration = 60;

const MAX_DATA_ROWS = 50_000;
const MAX_READ_BYTES = 250 * 1024 * 1024; // 250 MB safety cap
const SAMPLE_SIZE = 50;

// คำสำคัญที่บ่งบอกว่าเป็นหมวดแฟชั่น
const FASHION_KEYWORDS = [
  "แฟชั่น",
  "เสื้อผ้า",
  "เสื้อ",
  "กางเกง",
  "กระโปรง",
  "เดรส",
  "ชุด",
  "รองเท้า",
  "กระเป๋า",
  "เครื่องประดับ",
  "จิวเวลรี่",
  "ผ้า",
  "fashion",
  "clothing",
  "clothes",
  "apparel",
  "shirt",
  "pants",
  "skirt",
  "dress",
  "wear",
  "shoes",
  "bag",
  "handbag",
  "jewelry",
  "accessories",
  "outfit",
];

function looksLikeFashion(cat: string): boolean {
  if (!cat) return false;
  const lower = cat.toLowerCase();
  return FASHION_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

export type SampleProduct = {
  itemId: string;
  title: string;
  shopName: string;
  category1: string;
  category2: string;
  salePrice: string;
  originalPrice: string;
  discountPct: string;
  soldCount: string;
  likeCount: string;
  stockCount: string;
  rating: string;
  imageUrl: string;
  productUrl: string;
  isPreferredShop: string;
  isOfficialShop: string;
};

export type FeedPreviewResponse = {
  rowsScanned: number;
  limitReached: boolean;
  notSavedToSupabase: true;
  dataAvailability: {
    hasSalesData: boolean;
    hasPriceData: boolean;
    hasCommission: false;
    hasProductId: boolean;
  };
  categorySummary: { name: string; count: number }[];
  category2Summary: { name: string; count: number }[];
  fashionCategories: string[];
  sampleProducts: SampleProduct[];
};

export async function GET(): Promise<NextResponse> {
  const feedUrl = process.env.SHOPEE_PRODUCT_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json(
      { error: "ไม่พบการตั้งค่า SHOPEE_PRODUCT_FEED_URL ในระบบ" },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { Accept: "text/csv, text/plain, application/octet-stream, */*" },
    });
    clearTimeout(timeoutId);
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเชื่อมต่อกับ Shopee Product Feed ได้ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Shopee Product Feed ตอบกลับ HTTP ${response.status} — Feed URL อาจหมดอายุหรือถูกเพิกถอนสิทธิ์` },
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

  // สถานะการ parse
  let headerRow: string[] = [];
  const headerIdx: Record<string, number> = {};
  let dataRowCount = 0;
  let limitReached = false;

  const cat1Counts = new Map<string, number>();
  const cat2Counts = new Map<string, number>();
  const fashionCatSet = new Set<string>();
  const samples: SampleProduct[] = [];
  let hasSalesData = false;
  let hasPriceData = false;
  let hasProductId = false;

  function getField(row: string[], col: string): string {
    const idx = headerIdx[col];
    return idx !== undefined ? (row[idx] ?? "").trim() : "";
  }

  function processRow(row: string[]): boolean {
    // แถวแรกคือ header
    if (headerRow.length === 0) {
      headerRow = row.map((h) => h.trim());
      headerRow.forEach((h, i) => {
        headerIdx[h] = i;
      });
      return true;
    }

    if (dataRowCount >= MAX_DATA_ROWS) return false;
    dataRowCount++;

    const cat1 = getField(row, "global_category1");
    const cat2 = getField(row, "global_category2");
    const sold = getField(row, "item_sold");
    const salePrice = getField(row, "sale_price");
    const price = getField(row, "price");
    const itemId = getField(row, "itemid");

    if (cat1) {
      cat1Counts.set(cat1, (cat1Counts.get(cat1) ?? 0) + 1);
      if (looksLikeFashion(cat1)) fashionCatSet.add(cat1);
    }
    if (cat2) {
      cat2Counts.set(cat2, (cat2Counts.get(cat2) ?? 0) + 1);
      if (looksLikeFashion(cat2)) fashionCatSet.add(cat2);
    }

    if (!hasSalesData && sold && sold !== "0") hasSalesData = true;
    if (!hasPriceData && (salePrice || price)) hasPriceData = true;
    if (!hasProductId && itemId) hasProductId = true;

    if (samples.length < SAMPLE_SIZE) {
      samples.push({
        itemId,
        title: getField(row, "title"),
        shopName: getField(row, "shop_name"),
        category1: cat1,
        category2: cat2,
        salePrice,
        originalPrice: price,
        discountPct: getField(row, "discount_percentage"),
        soldCount: sold,
        likeCount: getField(row, "like"),
        stockCount: getField(row, "stock"),
        rating: getField(row, "item_rating"),
        imageUrl: getField(row, "image_link") || getField(row, "image_link_4"),
        productUrl: getField(row, "product_link"),
        isPreferredShop: getField(row, "is_preferred_shop"),
        isOfficialShop: getField(row, "is_official_shop"),
      });
    }

    return true;
  }

  try {
    while (!limitReached) {
      const { done, value } = await reader.read();

      if (done) {
        const { rows } = extractRows(remainder, true);
        for (const row of rows) {
          if (!processRow(row)) {
            limitReached = true;
            break;
          }
        }
        break;
      }

      let chunk = decoder.decode(value, { stream: true });
      bytesRead += value.byteLength;

      if (firstChunk) {
        if (chunk.startsWith("﻿")) chunk = chunk.slice(1);
        firstChunk = false;
      }

      const { rows, remainder: rem } = extractRows(remainder + chunk, false);
      remainder = rem;

      for (const row of rows) {
        if (!processRow(row)) {
          limitReached = true;
          break;
        }
      }

      if (bytesRead >= MAX_READ_BYTES) limitReached = true;
    }
  } catch {
    // best effort — ส่งคืนข้อมูลที่สะสมมาได้
  } finally {
    reader.cancel().catch(() => {});
  }

  const categorySummary = [...cat1Counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const category2Summary = [...cat2Counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));

  const result: FeedPreviewResponse = {
    rowsScanned: dataRowCount,
    limitReached,
    notSavedToSupabase: true,
    dataAvailability: {
      hasSalesData,
      hasPriceData,
      hasCommission: false,
      hasProductId,
    },
    categorySummary,
    category2Summary,
    fashionCategories: [...fashionCatSet].sort(),
    sampleProducts: samples,
  };

  return NextResponse.json(result);
}
