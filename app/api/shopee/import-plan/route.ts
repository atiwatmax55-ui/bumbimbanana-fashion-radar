import { NextResponse } from "next/server";
import { extractRows } from "@/lib/shopee/csv-parser";
import {
  isFashionByWhitelist,
  isFashionWhitelisted,
} from "@/lib/shopee/fashion-filter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCAN_LIMIT = 200_000;
const MAX_READ_BYTES = 500 * 1024 * 1024;
const TOP_IMPORT_COUNT = 1_000;

export type ImportPlanProduct = {
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

export type ImportPlanResponse = {
  scannedRows: number;
  isPartialScan: boolean;
  notSavedToSupabase: true;
  commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันใน Feed นี้ — ห้ามสร้างค่าปลอม";
  planSummary: {
    totalFashionFound: number;
    fashionCategoryCount: number;
    fashionCategoriesFound: string[];
    willImportCount: number;
  };
  importPlan: ImportPlanProduct[];
};

export async function POST(): Promise<NextResponse> {
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
      { error: `Shopee Product Feed ตอบกลับ HTTP ${response.status}` },
      { status: 502 },
    );
  }

  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    return NextResponse.json(
      { error: "Feed URL ส่งกลับ HTML แทน CSV — Feed URL อาจหมดอายุ" },
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

  let headerRow: string[] = [];
  const headerIdx: Record<string, number> = {};
  let dataRowCount = 0;
  let isPartialScan = false;
  let totalFashionFound = 0;
  const fashionCatSet = new Set<string>();

  type BufferedItem = { product: ImportPlanProduct; soldNum: number };
  const topBuffer: BufferedItem[] = [];

  function addToBuffer(product: ImportPlanProduct, soldNum: number) {
    if (topBuffer.length < TOP_IMPORT_COUNT) {
      topBuffer.push({ product, soldNum });
      if (topBuffer.length === TOP_IMPORT_COUNT) {
        topBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    } else {
      const minEntry = topBuffer[TOP_IMPORT_COUNT - 1];
      if (minEntry && soldNum > minEntry.soldNum) {
        topBuffer[TOP_IMPORT_COUNT - 1] = { product, soldNum };
        topBuffer.sort((a, b) => b.soldNum - a.soldNum);
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

    if (dataRowCount >= SCAN_LIMIT) return false;
    dataRowCount++;

    const cat1 = getField(row, "global_category1");
    const cat2 = getField(row, "global_category2");
    const cat3 = getField(row, "global_category3");

    if (!isFashionByWhitelist(cat1, cat2, cat3)) return true;

    totalFashionFound++;
    if (isFashionWhitelisted(cat1)) fashionCatSet.add(cat1);
    if (isFashionWhitelisted(cat2)) fashionCatSet.add(cat2);
    if (cat3 && isFashionWhitelisted(cat3)) fashionCatSet.add(cat3);

    const itemSold = getField(row, "item_sold");
    const soldNum = parseInt(itemSold, 10) || 0;
    const imageUrl = getField(row, "image_link") || getField(row, "image_link_4");

    addToBuffer(
      {
        itemId: getField(row, "itemid"),
        title: getField(row, "title"),
        category1: cat1,
        category2: cat2,
        category3: cat3,
        salePrice: getField(row, "sale_price"),
        originalPrice: getField(row, "price"),
        itemSold,
        itemRating: getField(row, "item_rating"),
        shopRating: getField(row, "shop_rating"),
        likeCount: getField(row, "like"),
        shopName: getField(row, "shop_name"),
        isPreferredShop: getField(row, "is_preferred_shop"),
        isOfficialShop: getField(row, "is_official_shop"),
        imageUrl,
        productUrl: getField(row, "product_link"),
      },
      soldNum,
    );

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
        if (chunk.startsWith("﻿")) chunk = chunk.slice(1);
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
    // best effort
  } finally {
    reader.cancel().catch(() => {});
  }

  const importPlan: ImportPlanProduct[] = topBuffer
    .sort((a, b) => b.soldNum - a.soldNum)
    .map((item) => item.product);

  const result: ImportPlanResponse = {
    scannedRows: dataRowCount,
    isPartialScan,
    notSavedToSupabase: true,
    commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันใน Feed นี้ — ห้ามสร้างค่าปลอม",
    planSummary: {
      totalFashionFound,
      fashionCategoryCount: fashionCatSet.size,
      fashionCategoriesFound: [...fashionCatSet].sort(),
      willImportCount: importPlan.length,
    },
    importPlan,
  };

  return NextResponse.json(result);
}
