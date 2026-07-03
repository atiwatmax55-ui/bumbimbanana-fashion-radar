import type { Product } from "@/types/product";
import { buildProductFromDraft, type ProductDraft } from "@/lib/data-source/build-product";
import { computeProductRanks } from "@/lib/data-source/compute-ranks";

/** วันที่ซิงก์ข้อมูล Mock Data ล่าสุด ใช้ร่วมกันทุกหน้าที่แสดงสถานะข้อมูล */
export const MOCK_DATA_LAST_SYNCED_AT = "2026-06-27T06:00:00+07:00";

type RawProduct = ProductDraft;

const RAW_PRODUCTS: RawProduct[] = [
  // กางเกงยีนส์
  { productName: "กางเกงยีนส์ขาบานทรงสูง เอวสูงเก็บหน้าท้อง", shopName: "Denimhouse.th", category: "กางเกงยีนส์", price: 459, commissionRate: 18, sales7d: 1280, sales30d: 4600, growthRate: 32.4, interestScore: 88 },
  { productName: "กางเกงยีนส์สกินนี่ผ้ายืด ใส่สบายทรงสวย", shopName: "BAMBI.CO", category: "กางเกงยีนส์", price: 329, commissionRate: 22, sales7d: 2100, sales30d: 7400, growthRate: 54.1, interestScore: 91 },
  { productName: "กางเกงยีนส์ขาตรงสีฟอกขาว แต่งขาดนิดๆ", shopName: "Cher Closet", category: "กางเกงยีนส์", price: 399, commissionRate: 15, sales7d: 540, sales30d: 1900, growthRate: -6.2, interestScore: 62 },
  { productName: "กางเกงยีนส์เอวต่ำทรงบอยเฟรนด์ สายวินเทจ", shopName: "Minimal House", category: "กางเกงยีนส์", price: 379, commissionRate: 12, sales7d: 310, sales30d: 1100, growthRate: 8.7, interestScore: 58 },

  // กางเกงขากระบอก
  { productName: "กางเกงขากระบอกผ้าซาตินเงา เอวสูงทรงหรู", shopName: "Studio Lin", category: "กางเกงขากระบอก", price: 459, commissionRate: 20, sales7d: 980, sales30d: 3300, growthRate: 41.5, interestScore: 85 },
  { productName: "กางเกงขากระบอกผ้าคอตตอนเบา ใส่ทำงานได้", shopName: "Minimal House", category: "กางเกงขากระบอก", price: 349, commissionRate: 14, sales7d: 420, sales30d: 1500, growthRate: 4.3, interestScore: 60 },
  { productName: "กางเกงขากระบอกลายสก๊อต สไตล์เกาหลี", shopName: "Cher Closet", category: "กางเกงขากระบอก", price: 389, commissionRate: 16, sales7d: 610, sales30d: 2050, growthRate: 19.8, interestScore: 71 },

  // เสื้อครอป
  { productName: "เสื้อครอปแขนกุดคอกลม ผ้ายืดเนื้อนิ่ม", shopName: "BAMBI.CO", category: "เสื้อครอป", price: 199, commissionRate: 25, sales7d: 1850, sales30d: 6200, growthRate: 67.9, interestScore: 93 },
  { productName: "เสื้อครอปลายทางคอปก แมตช์ง่าย", shopName: "Denimhouse.th", category: "เสื้อครอป", price: 229, commissionRate: 18, sales7d: 760, sales30d: 2600, growthRate: 22.1, interestScore: 74 },
  { productName: "เสื้อครอปไหล่เปิด ผ้าลูกไม้หวาน", shopName: "Studio Lin", category: "เสื้อครอป", price: 259, commissionRate: 21, sales7d: 1120, sales30d: 3700, growthRate: 38.6, interestScore: 82 },

  // เสื้อเชิ้ต
  { productName: "เสื้อเชิ้ตผ้าลินินทรงโอเวอร์ไซส์", shopName: "Minimal House", category: "เสื้อเชิ้ต", price: 349, commissionRate: 16, sales7d: 690, sales30d: 2300, growthRate: 11.4, interestScore: 70 },
  { productName: "เสื้อเชิ้ตคอโบว์แต่งระบาย หวานละมุน", shopName: "Cher Closet", category: "เสื้อเชิ้ต", price: 319, commissionRate: 19, sales7d: 880, sales30d: 2950, growthRate: 26.7, interestScore: 77 },
  { productName: "เสื้อเชิ้ตลายดอกแขนยาว ผ้าเรยอนเย็นสบาย", shopName: "Studio Lin", category: "เสื้อเชิ้ต", price: 339, commissionRate: 14, sales7d: 350, sales30d: 1200, growthRate: -2.8, interestScore: 56 },

  // เดรส
  { productName: "เดรสสายเดี่ยวผ้าซาตินทรงเอ ใส่ออกงานได้", shopName: "BAMBI.CO", category: "เดรส", price: 590, commissionRate: 24, sales7d: 1640, sales30d: 5400, growthRate: 48.9, interestScore: 90 },
  { productName: "เดรสลายดอกแขนพอง สไตล์เกาหลีหวาน", shopName: "Studio Lin", category: "เดรส", price: 459, commissionRate: 20, sales7d: 2350, sales30d: 8100, growthRate: 71.3, interestScore: 95 },
  { productName: "เดรสคอจีนแขนกุด ผ้าไหมอิตาลีเทียม", shopName: "Minimal House", category: "เดรส", price: 690, commissionRate: 17, sales7d: 430, sales30d: 1450, growthRate: 5.6, interestScore: 64 },
  { productName: "เดรสยาวพิมพ์ลายช่อดอก ผ้าชีฟองโปร่งบาง", shopName: "Cher Closet", category: "เดรส", price: 529, commissionRate: 23, sales7d: 990, sales30d: 3250, growthRate: 29.4, interestScore: 80 },

  // กระโปรง
  { productName: "กระโปรงพลีทยาวเอวสูง ทรงสวยเข้ารูป", shopName: "BAMBI.CO", category: "กระโปรง", price: 359, commissionRate: 19, sales7d: 1050, sales30d: 3600, growthRate: 35.2, interestScore: 83 },
  { productName: "กระโปรงยีนส์สั้น ขอบขาดสไตล์สตรีท", shopName: "Denimhouse.th", category: "กระโปรง", price: 299, commissionRate: 15, sales7d: 480, sales30d: 1650, growthRate: 1.9, interestScore: 61 },
  { productName: "กระโปรงซาตินทรงเอ ผ้าตกสวยเงางาม", shopName: "Studio Lin", category: "กระโปรง", price: 329, commissionRate: 18, sales7d: 720, sales30d: 2400, growthRate: 17.5, interestScore: 73 },

  // ชุดเซ็ต
  { productName: "ชุดเซ็ตเสื้อกล้ามกางเกงขาสั้น ผ้าลินิน 2 ชิ้น", shopName: "Minimal House", category: "ชุดเซ็ต", price: 590, commissionRate: 22, sales7d: 1420, sales30d: 4750, growthRate: 44.8, interestScore: 87 },
  { productName: "ชุดเซ็ตเสื้อครอปกระโปรงพลีท สไตล์ออฟฟิศ", shopName: "Cher Closet", category: "ชุดเซ็ต", price: 650, commissionRate: 20, sales7d: 870, sales30d: 2900, growthRate: 21.3, interestScore: 76 },
  { productName: "ชุดเซ็ตเสื้อเชิ้ตกางเกงขายาว โทนสีพื้น", shopName: "Studio Lin", category: "ชุดเซ็ต", price: 690, commissionRate: 16, sales7d: 390, sales30d: 1300, growthRate: -4.5, interestScore: 59 },

  // เสื้อออกกำลังกาย
  { productName: "เสื้อออกกำลังกายเก็บทรง ผ้ายืดระบายอากาศ", shopName: "FitForm.th", category: "เสื้อออกกำลังกาย", price: 279, commissionRate: 27, sales7d: 1960, sales30d: 6500, growthRate: 58.7, interestScore: 92 },
  { productName: "เสื้อกล้ามออกกำลังกายสายไขว้หลัง", shopName: "BAMBI.CO", category: "เสื้อออกกำลังกาย", price: 199, commissionRate: 24, sales7d: 1280, sales30d: 4300, growthRate: 49.6, interestScore: 89 },
  { productName: "เสื้อออกกำลังกายแขนยาวกันแดด ผ้าเย็น UV", shopName: "FitForm.th", category: "เสื้อออกกำลังกาย", price: 329, commissionRate: 18, sales7d: 560, sales30d: 1900, growthRate: 9.2, interestScore: 67 },

  // รองเท้า
  { productName: "รองเท้าผ้าใบสีขาวพื้นหนา เพิ่มความสูง", shopName: "StepLab", category: "รองเท้า", price: 690, commissionRate: 13, sales7d: 1340, sales30d: 4500, growthRate: 27.6, interestScore: 81 },
  { productName: "รองเท้าส้นสูงสายรัดข้อ ผ้าซาตินเรียบหรู", shopName: "Cher Closet", category: "รองเท้า", price: 590, commissionRate: 17, sales7d: 470, sales30d: 1600, growthRate: 3.4, interestScore: 63 },
  { productName: "รองเท้าแซนดัลส้นแบน หนัง PU นิ่ม", shopName: "StepLab", category: "รองเท้า", price: 459, commissionRate: 15, sales7d: 690, sales30d: 2350, growthRate: 13.8, interestScore: 69 },

  // กระเป๋า
  { productName: "กระเป๋าสะพายข้างทรงจิ๋ว หนัง PU เงา", shopName: "Studio Lin", category: "กระเป๋า", price: 459, commissionRate: 21, sales7d: 1510, sales30d: 5100, growthRate: 46.3, interestScore: 86 },
  { productName: "กระเป๋าโทตผ้าแคนวาสจุของเยอะ", shopName: "Minimal House", category: "กระเป๋า", price: 359, commissionRate: 14, sales7d: 380, sales30d: 1300, growthRate: -1.5, interestScore: 57 },
  { productName: "กระเป๋าคลัตช์ออกงาน ปักลายมุก", shopName: "BAMBI.CO", category: "กระเป๋า", price: 529, commissionRate: 19, sales7d: 640, sales30d: 2150, growthRate: 15.9, interestScore: 72 },
];

function buildProducts(): Product[] {
  const withoutRanks = RAW_PRODUCTS.map((raw, index) => {
    const id = String(index + 1).padStart(3, "0");
    return buildProductFromDraft(raw, id, MOCK_DATA_LAST_SYNCED_AT);
  });

  return computeProductRanks(withoutRanks);
}

/** สินค้าแฟชั่นผู้หญิงตัวอย่างทั้งหมดในระบบ (Mock Data) */
export const mockProducts: Product[] = buildProducts();
