import type { Product } from "@/types/product";
import { formatPercent } from "@/lib/utils/format";

export interface ProductInsights {
  /** จุดเด่นของสินค้า */
  highlights: string[];
  /** เหตุผลที่น่าสนใจ */
  reasons: string[];
  /** เหมาะกับการทำคอนเทนต์แบบไหน */
  contentIdeas: string[];
}

const CONTENT_IDEA_BY_CATEGORY: Record<string, string> = {
  กางเกงยีนส์: "วิดีโอรีวิวการลองไซซ์และจับคู่เสื้อหลายแบบ",
  กางเกงขากระบอก: "คลิปแนะนำการแมตช์ลุคทำงานและลุคลำลอง",
  เสื้อครอป: "คลิปแต่งตัวลุคซัมเมอร์โชว์เอว",
  เสื้อเชิ้ต: "คลิปสอนผูกเสื้อเชิ้ตหลายสไตล์",
  เดรส: "คลิปลองชุดออกงานหรือเดทลุค",
  กระโปรง: "คลิปแมตช์กระโปรงกับรองเท้าหลายแบบ",
  ชุดเซ็ต: "คลิปแต่งตัวพร้อมออกจากบ้านใน 1 นาที",
  เสื้อออกกำลังกาย: "คลิปออกกำลังกายพร้อมรีวิวเนื้อผ้า",
  รองเท้า: "คลิปรีวิวความสบายตอนใส่เดินทั้งวัน",
  กระเป๋า: "คลิปแกะกล่องพร้อมจัดของในกระเป๋า",
};

/** สร้างข้อมูลสรุปเชิงคุณภาพของสินค้าจากตัวเลขจริงของสินค้านั้น ใช้แสดงในหน้า Product Detail (หน้ารายละเอียดสินค้า) */
export function getProductInsights(product: Product): ProductInsights {
  const highlights: string[] = [];
  const reasons: string[] = [];

  if (product.commissionRank <= 5) {
    highlights.push(`ค่าคอมมิชชันติดอันดับ ${product.commissionRank} ของระบบ (${formatPercent(product.commissionRate)})`);
  } else if (product.commissionRate >= 20) {
    highlights.push(`ค่าคอมมิชชันสูงถึง ${formatPercent(product.commissionRate)}`);
  } else {
    highlights.push(`ค่าคอมมิชชัน ${formatPercent(product.commissionRate)} ต่อยอดขาย 1 ชิ้น`);
  }

  if (product.salesRank <= 5) {
    highlights.push(`ยอดขายติดอันดับ ${product.salesRank} ของสินค้าแฟชั่นทั้งหมด`);
  } else {
    highlights.push(`ยอดขาย 30 วัน รวม ${product.sales30d.toLocaleString("th-TH")} ชิ้น`);
  }

  if (product.growthRank <= 5) {
    highlights.push(`อัตราการเติบโตติดอันดับ ${product.growthRank} เติบโต ${formatPercent(product.growthRate, true)}`);
  }

  if (product.growthRate >= 30) {
    reasons.push(`ยอดขายกำลังเติบโตเร็วถึง ${formatPercent(product.growthRate, true)} เมื่อเทียบช่วงก่อนหน้า น่าจับตาเป็นพิเศษ`);
  } else if (product.growthRate >= 0) {
    reasons.push(`ยอดขายยังเติบโตต่อเนื่อง ${formatPercent(product.growthRate, true)} ถือว่าทรงตัวในทางที่ดี`);
  } else {
    reasons.push(`ยอดขายเริ่มชะลอตัว ${formatPercent(product.growthRate, true)} อาจต้องรีเฟรชคอนเทนต์เพื่อกระตุ้นยอด`);
  }

  if (product.interestScore >= 85) {
    reasons.push(`คะแนนความน่าสนใจสูงถึง ${product.interestScore} คะแนน อยู่ในกลุ่มสินค้าที่น่าทำคอนเทนต์มากที่สุด`);
  } else if (product.interestScore >= 70) {
    reasons.push(`คะแนนความน่าสนใจอยู่ที่ ${product.interestScore} คะแนน ถือว่าน่าสนใจกว่าค่าเฉลี่ย`);
  } else {
    reasons.push(`คะแนนความน่าสนใจอยู่ที่ ${product.interestScore} คะแนน เหมาะเก็บไว้ติดตามเพิ่มเติม`);
  }

  reasons.push(`ราคาขาย ${product.price.toLocaleString("th-TH")} บาท อยู่ในระดับที่ตัดสินใจซื้อได้ง่ายสำหรับกลุ่มลูกค้าแฟชั่นผู้หญิง`);

  const contentIdeas = [
    CONTENT_IDEA_BY_CATEGORY[product.category] ?? "คลิปรีวิวสินค้าแบบเล่าจุดเด่นตรงๆ",
    product.growthRate >= 30
      ? "คอนเทนต์จับเทรนด์ที่กำลังมาแรง เพื่อขี่กระแสตอนยอดขายพุ่ง"
      : "คอนเทนต์รีวิวเจาะลึกเพื่อสร้างความน่าเชื่อถือระยะยาว",
  ];

  return { highlights, reasons, contentIdeas };
}
