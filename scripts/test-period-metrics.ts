/**
 * ทดสอบ logic วิเคราะห์ 7/30 วัน + Trend Score + ป้าย "ควรรีบทำคอนเทนต์" + ตัวกรองเสื้อผ้าผู้หญิง
 * วิธีรัน: npx tsx scripts/test-period-metrics.ts
 */
import { computeAnalytics, computeGrowthPct, type BaselineRow } from "../lib/analytics/period-metrics";
import { classifyWomenFashion, checkMaterialViolation } from "../lib/shopee/women-fashion-filter";

let failed = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failed++;
}

// ─── 1. growth guard: ห้ามหารศูนย์/Infinity ─────────────────────────────────
check("growth จากฐานศูนย์ = null (ไม่ใช่ Infinity)", computeGrowthPct(50, 0) === null);
check("growth จากฐาน null = null", computeGrowthPct(50, null) === null);
check("growth ปกติ 100→150 = +50%", computeGrowthPct(150, 100) === 50);

// ─── 2. computeAnalytics ครบวงจร ─────────────────────────────────────────────
const now = new Date("2026-07-04T12:00:00Z");
const baselines: BaselineRow[] = [
  // สินค้า 1: ข้อมูลครบ 7/14 วัน → 7d ได้, 30d ไม่ได้ | โต 100% (200 vs 100)
  { product_id: 1, latest_sold: 1300, latest_date: "2026-07-04", sold_7d_ago: 1100, sold_14d_ago: 1000, sold_30d_ago: null, sold_60d_ago: null, earliest_date: "2026-06-20", snapshot_days: 15 },
  // สินค้า 2: ขายเยอะกว่าแต่โตน้อย (50 vs 100 = -50%)
  { product_id: 2, latest_sold: 5050, latest_date: "2026-07-04", sold_7d_ago: 5000, sold_14d_ago: 4900, sold_30d_ago: null, sold_60d_ago: null, earliest_date: "2026-06-20", snapshot_days: 15 },
  // สินค้า 3: ไม่มี baseline 14 วัน → growth = null แต่ units ใช้ได้
  { product_id: 3, latest_sold: 800, latest_date: "2026-07-04", sold_7d_ago: 500, sold_14d_ago: null, sold_30d_ago: null, sold_60d_ago: null, earliest_date: "2026-06-27", snapshot_days: 8 },
  // สินค้า 4: item_sold ถูกรีเซ็ต (ลดลง) → units ต้องเป็น 0 ไม่ติดลบ
  { product_id: 4, latest_sold: 100, latest_date: "2026-07-04", sold_7d_ago: 500, sold_14d_ago: 400, sold_30d_ago: null, sold_60d_ago: null, earliest_date: "2026-06-20", snapshot_days: 15 },
];
const products = [
  { productId: 1, price: 300, commissionRate: 10, firstSeenAt: "2026-06-20T00:00:00Z" },
  { productId: 2, price: 300, commissionRate: 15, firstSeenAt: "2026-06-20T00:00:00Z" },
  { productId: 3, price: 300, commissionRate: null, firstSeenAt: "2026-06-27T00:00:00Z" },
  { productId: 4, price: 300, commissionRate: null, firstSeenAt: "2026-06-20T00:00:00Z" },
  // สินค้า 5: ไม่มี snapshot เลย → ทุก metric = null, เป็นสินค้าใหม่ (พบ 2 วันก่อน)
  { productId: 5, price: 300, commissionRate: null, firstSeenAt: "2026-07-02T10:00:00Z" },
];
const r = computeAnalytics(products, baselines, "2026-06-20T00:00:00Z", now);

const a1 = r.byProductId.get(1)!;
const a2 = r.byProductId.get(2)!;
const a3 = r.byProductId.get(3)!;
const a4 = r.byProductId.get(4)!;
const a5 = r.byProductId.get(5)!;

check("สินค้า 1: units 7 วัน = 200", a1.d7?.units === 200);
check("สินค้า 1: revenue 7 วัน = 60,000 บาท", a1.d7?.revenue === 60000);
check("สินค้า 1: growth = +100%", a1.d7?.growthPct === 100);
check("สินค้า 1: ไม่มีข้อมูล 30 วัน = null", a1.d30 === null);
check("สินค้า 2: growth = -50%", a2.d7?.growthPct === -50);
check("สินค้า 3: growth = null (ไม่มีฐาน)", a3.d7?.growthPct === null);
check("สินค้า 3: units ยังคำนวณได้ = 300", a3.d7?.units === 300);
check("สินค้า 4: units ไม่ติดลบ (รีเซ็ต) = 0", a4.d7?.units === 0);
check("สินค้า 5: ไม่มี snapshot → d7 = null", a5.d7 === null);

// อันดับยอดขายบาท: สินค้า 3 (300 ชิ้น × ฿300 = ฿90,000) > สินค้า 1 (฿60,000) > สินค้า 2 (฿15,000)
check("อันดับยอดขาย 7 วัน: สินค้า 3 = #1", a3.d7?.salesRank === 1);
check("อันดับยอดขาย 7 วัน: สินค้า 1 = #2", a1.d7?.salesRank === 2);
check("อันดับมาแรง: สินค้า 1 มาแรงกว่าสินค้า 4", (a1.d7?.trendRank ?? 99) < (a4.d7?.trendRank ?? 99));

// ป้าย: สินค้า 1 โต 100% + TOP → ติดป้าย | สินค้า 2 โตติดลบ → ห้ามติด | สินค้า 5 ไม่มีข้อมูล → ห้ามติด
check("ป้าย: สินค้า 1 ติดป้าย", a1.badge7 !== null);
check(`ป้าย: เหตุผลมีอันดับ+เปอร์เซ็นต์ ("${a1.badge7?.reason}")`, /#\d+ • โต \d+%/.test(a1.badge7?.reason ?? ""));
check("ป้าย: สินค้า 2 (โตติดลบ) ไม่ติดป้าย", a2.badge7 === null);
check("ป้าย: สินค้า 5 (ข้อมูลไม่พอ) ไม่ติดป้าย", a5.badge7 === null);

// ค่าคอม: อันดับเฉพาะสินค้าที่มีค่าคอมจริง
check("อันดับค่าคอม: สินค้า 2 (15%) = #1", r.commissionRankById.get(2) === 1);
check("อันดับค่าคอม: สินค้า 3 (ไม่มีข้อมูล) ไม่มีอันดับ", r.commissionRankById.get(3) === undefined);

// สินค้าใหม่: สินค้า 5 พบ 2026-07-02 (หลัง baseline 06-20 +24h, ภายใน 7 วัน) → ใหม่
check("สินค้าใหม่: สินค้า 5 เป็นสินค้าใหม่", a5.isNew === true);
check("สินค้าใหม่: สินค้า 1 (ชุดข้อมูลตั้งต้น) ไม่ใช่", a1.isNew === false);

// ─── 3. ตัวกรองเสื้อผ้าผู้หญิง v4 (รองเท้า/กระเป๋าผู้หญิง + title gender guard) ─
const pass = (c1: string, c2 = "", c3 = "", title = "") =>
  classifyWomenFashion(c1, c2, c3, title).pass;
check("ผ่าน: Women Clothes / Dresses", pass("Women Clothes", "Dresses"));
check("ผ่าน: Women Clothes / Tops", pass("Women Clothes", "Tops"));
check("ผ่าน: Dresses (standalone)", pass("Dresses"));
check("ผ่าน: Skirts (standalone)", pass("Skirts"));
check("ผ่าน: Women Shoes ชื่อไม่มีคำต้องห้าม", pass("Women Shoes", "Wedges", "", "รองเท้าส้นสูงสีดำ"));
check("ผ่าน: Women Bags ชื่อไม่มีคำต้องห้าม", pass("Women Bags", "", "", "กระเป๋าสะพายหนัง PU"));
check("ผ่าน: Women Shoes ชื่อมีคำว่า women (ไม่ติด false positive กับ men)",
  pass("Women Shoes", "", "", "Women sneakers black"));
check("ไม่ผ่าน: Women Shoes ชื่อมีคำว่า 'ผู้ชาย'", !pass("Women Shoes", "", "", "รองเท้าผู้ชาย size 42"));
check("ไม่ผ่าน: Women Bags ชื่อมีคำว่า kids", !pass("Women Bags", "", "", "Kids backpack cute"));
check("ไม่ผ่าน: Women Shoes ชื่อมีคำว่า men (แยกจาก women ได้)",
  !pass("Women Shoes", "", "", "Men sneakers black"));
check("ไม่ผ่าน: Shoes ทั่วไป (unisex ไม่ระบุเพศ)", !pass("Shoes"));
check("ไม่ผ่าน: Men Shoes", !pass("Men Shoes"));
check("ไม่ผ่าน: Fashion Accessories (เครื่องประดับ)", !pass("Fashion Accessories", "Earrings"));
check("ไม่ผ่าน: Women Clothes / Socks & Stockings (ถุงเท้า)", !pass("Women Clothes", "Socks & Stockings"));
check("ไม่ผ่าน: Women Clothes / Lingerie & Underwear (ชุดชั้นใน)", !pass("Women Clothes", "Lingerie & Underwear"));
check("ไม่ผ่าน: Men Clothes (ผู้ชาย)", !pass("Men Clothes", "Shirts"));
check("ไม่ผ่าน: Girl Clothes (เด็ก)", !pass("Girl Clothes"));
check("ไม่ผ่าน: Beauty (เครื่องสำอาง/ไม่เกี่ยว)", !pass("Beauty", "Makeup"));
check("ไม่ผ่าน: หมวดว่าง (ไม่มั่นใจ = ซ่อน)", !pass("", "", ""));
check("ไม่ผ่าน (วัสดุ): Women Clothes + ชื่อมี 'อะไหล่'",
  checkMaterialViolation("Women Clothes", "Tops", "", "อะไหล่ซิปเสื้อ DIY").violated);

console.log(failed === 0 ? "\n🎉 ผ่านทุกกรณี" : `\n💥 ล้มเหลว ${failed} กรณี`);
process.exit(failed === 0 ? 0 : 1);
