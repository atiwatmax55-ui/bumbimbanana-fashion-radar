import { type NextRequest, NextResponse } from "next/server";
import { extractRows } from "@/lib/shopee/csv-parser";
import {
  classifyWomenFashion,
  checkMaterialViolation,
  validateProductCategories,
} from "@/lib/shopee/women-fashion-filter";
import { isFashionByWhitelist } from "@/lib/shopee/fashion-filter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ABSOLUTE_MAX_LIMIT = 200_000;
const MAX_READ_BYTES = 500 * 1024 * 1024;
const TOP_COUNT = 500;
const MAX_VIOLATION_DETAILS = 15;

export type WomenFashionProduct = {
  itemId: string;
  title: string;
  category1: string;
  category2: string;
  category3: string;
  salePriceThb: string;
  itemSold: string;
  itemRating: string;
  likeCount: string;
  shopName: string;
  isPreferredShop: string;
  isOfficialShop: string;
  imageUrl: string;
  productUrl: string;
  passedByRule: string;
  filterReason: string;
};

export type ViolationDetail = {
  rank: number;
  title: string;
  category1: string;
  category2: string;
  category3: string;
  violationType: string;
  violatingValue: string;
};

export type WomenFashionPreviewResponse = {
  scannedRows: number;
  effectiveLimit: number;
  isPartialScan: boolean;
  notSavedToSupabase: true;
  commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันจาก Feed";
  priceNote: "อ้างอิงราคาจาก Shopee Feed";
  filterStats: {
    /** ก่อนกรอง — ผ่าน Fashion Whitelist กว้าง (31 หมวด รวม Men's/Kids') */
    generalFashionCount: number;
    /** ผ่าน Women Fashion filter (deny-first) แต่ยังไม่ผ่าน material check */
    womenFashionBeforeMaterial: number;
    /** ตัดออกเพราะเป็นวัสดุ/อุปกรณ์/ดูแลสินค้า */
    materialExcludedCount: number;
    /** สุดท้าย — ผ่านทั้ง 2 filter */
    womenFashionFinalCount: number;
    /** ตัดออกรวม (generalFashionCount - womenFashionFinalCount) */
    excludedFromGeneral: number;
    byRule: {
      cat1Women: number;
      standaloneWomen: number;
      fashionAccessoriesSub: number;
    };
  };
  validationSummary: {
    menViolations: number;
    boyGirlViolations: number;
    babyViolations: number;
    materialViolations: number;
    totalViolations: number;
    isReadyToImport: boolean;
    violationDetails: ViolationDetail[];
  };
  products: WomenFashionProduct[];
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
    Math.max(
      1,
      parseInt(limitParam ?? String(ABSOLUTE_MAX_LIMIT), 10) || ABSOLUTE_MAX_LIMIT,
    ),
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

  let generalFashionCount = 0;
  let womenFashionBeforeMaterial = 0;
  let materialExcludedCount = 0;
  let womenFashionFinalCount = 0;
  let cat1WomenCount = 0;
  let standaloneWomenCount = 0;
  let fashionAccessoriesSubCount = 0;

  type BufferedItem = { product: WomenFashionProduct; soldNum: number };
  const topBuffer: BufferedItem[] = [];

  function addToBuffer(product: WomenFashionProduct, soldNum: number) {
    if (topBuffer.length < TOP_COUNT) {
      topBuffer.push({ product, soldNum });
      if (topBuffer.length === TOP_COUNT) {
        topBuffer.sort((a, b) => b.soldNum - a.soldNum);
      }
    } else {
      const minEntry = topBuffer[TOP_COUNT - 1];
      if (minEntry && soldNum > minEntry.soldNum) {
        topBuffer[TOP_COUNT - 1] = { product, soldNum };
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

    if (dataRowCount >= effectiveLimit) return false;
    dataRowCount++;

    const cat1 = getField(row, "global_category1");
    const cat2 = getField(row, "global_category2");
    const cat3 = getField(row, "global_category3");
    const title = getField(row, "title");
    const salePrice = getField(row, "sale_price");
    const itemSold = getField(row, "item_sold");

    // "ก่อนกรอง" — ผ่าน Fashion Whitelist กว้าง 31 หมวด
    if (isFashionByWhitelist(cat1, cat2, cat3)) {
      generalFashionCount++;
    }

    // ─ ชั้น 1: Women Fashion Filter (deny-first + hierarchical allow) ─────────
    const cl = classifyWomenFashion(cat1, cat2, cat3);
    if (!cl.pass) return true;

    womenFashionBeforeMaterial++;

    // ─ ชั้น 2: Material / Tools / Care filter ────────────────────────────────
    const mv = checkMaterialViolation(cat1, cat2, cat3, title);
    if (mv.violated) {
      materialExcludedCount++;
      return true;
    }

    // ─ ผ่านทั้ง 2 ชั้น → เข้า buffer ─────────────────────────────────────────
    womenFashionFinalCount++;
    if (cl.rule === "cat1_women") cat1WomenCount++;
    else if (cl.rule === "standalone_women") standaloneWomenCount++;
    else if (cl.rule === "fashion_accessories_sub") fashionAccessoriesSubCount++;

    const soldNum = parseInt(itemSold, 10) || 0;
    const imageUrl = getField(row, "image_link") || getField(row, "image_link_4");

    addToBuffer(
      {
        itemId: getField(row, "itemid"),
        title,
        category1: cat1,
        category2: cat2,
        category3: cat3,
        salePriceThb: salePrice,
        itemSold,
        itemRating: getField(row, "item_rating"),
        likeCount: getField(row, "like"),
        shopName: getField(row, "shop_name"),
        isPreferredShop: getField(row, "is_preferred_shop"),
        isOfficialShop: getField(row, "is_official_shop"),
        imageUrl,
        productUrl: getField(row, "product_link"),
        passedByRule: cl.rule,
        filterReason: cl.filterReason,
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

  const products: WomenFashionProduct[] = topBuffer
    .sort((a, b) => b.soldNum - a.soldNum)
    .map((item) => item.product);

  // ─── Automated Validation — ตรวจซ้ำทุกแถวใน Top buffer ──────────────────
  let menViolations = 0;
  let boyGirlViolations = 0;
  let babyViolations = 0;
  let materialViolations = 0;
  const violationDetails: ViolationDetail[] = [];

  function addViolationDetail(
    i: number,
    p: WomenFashionProduct,
    violationType: string,
    violatingValue: string,
  ) {
    if (violationDetails.length < MAX_VIOLATION_DETAILS) {
      violationDetails.push({
        rank: i + 1,
        title: p.title,
        category1: p.category1,
        category2: p.category2,
        category3: p.category3,
        violationType,
        violatingValue,
      });
    }
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // Men / Boy / Baby check
    const v = validateProductCategories(p.category1, p.category2, p.category3);
    if (v.menViolation) {
      menViolations++;
      addViolationDetail(i, p, "men", v.violatingCategory ?? "unknown");
    } else if (v.boyGirlViolation) {
      boyGirlViolations++;
      addViolationDetail(i, p, "boy_girl", v.violatingCategory ?? "unknown");
    } else if (v.babyViolation) {
      babyViolations++;
      addViolationDetail(i, p, "baby", v.violatingCategory ?? "unknown");
    }

    // Material / Tools / Care check
    const mv2 = checkMaterialViolation(p.category1, p.category2, p.category3, p.title);
    if (mv2.violated) {
      materialViolations++;
      addViolationDetail(
        i,
        p,
        mv2.violationType === "category" ? "material_category" : "material_title",
        mv2.violatingValue ?? "unknown",
      );
    }
  }

  const totalViolations = menViolations + boyGirlViolations + babyViolations + materialViolations;

  const result: WomenFashionPreviewResponse = {
    scannedRows: dataRowCount,
    effectiveLimit,
    isPartialScan,
    notSavedToSupabase: true,
    commissionStatus: "ไม่มีข้อมูลค่าคอมมิชชันจาก Feed",
    priceNote: "อ้างอิงราคาจาก Shopee Feed",
    filterStats: {
      generalFashionCount,
      womenFashionBeforeMaterial,
      materialExcludedCount,
      womenFashionFinalCount,
      excludedFromGeneral: generalFashionCount - womenFashionFinalCount,
      byRule: {
        cat1Women: cat1WomenCount,
        standaloneWomen: standaloneWomenCount,
        fashionAccessoriesSub: fashionAccessoriesSubCount,
      },
    },
    validationSummary: {
      menViolations,
      boyGirlViolations,
      babyViolations,
      materialViolations,
      totalViolations,
      isReadyToImport: totalViolations === 0,
      violationDetails,
    },
    products,
  };

  return NextResponse.json(result);
}
