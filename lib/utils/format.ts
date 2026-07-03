/** ฟังก์ชันฟอร์แมตตัวเลข/วันที่ที่ใช้ร่วมกันทุกหน้า เพื่อให้การแสดงผลตัวเลขเด่นและสม่ำเสมอตามแนวทางแบรนด์ */

/** ฟอร์แมตจำนวนเงินเป็นบาท เช่น 1234 -> "฿1,234" */
export function formatBaht(value: number): string {
  const rounded = Math.round(value);
  return `฿${rounded.toLocaleString("th-TH")}`;
}

/** ฟอร์แมตจำนวนเงินแบบย่อ เช่น 1,250,000 -> "฿1.25 ล้าน" ใช้กับตัวเลขก้อนใหญ่บน Dashboard */
export function formatBahtCompact(value: number): string {
  if (value >= 1_000_000) {
    return `฿${(value / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน`;
  }
  if (value >= 1_000) {
    return `฿${(value / 1_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} พัน`;
  }
  return formatBaht(value);
}

/** ฟอร์แมตจำนวนนับ เช่น ยอดขาย เช่น 1234 -> "1,234" */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("th-TH");
}

/** ฟอร์แมตจำนวนนับแบบย่อ เช่น 12500 -> "12.5 พัน" ใช้กับตัวเลขก้อนใหญ่บน Dashboard */
export function formatNumberCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} พัน`;
  }
  return formatNumber(value);
}

/** ฟอร์แมตเปอร์เซ็นต์ เช่น 12.5 -> "12.5%" และ -3.2 -> "-3.2%" */
export function formatPercent(value: number, withSign = false): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("th-TH", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

/** ฟอร์แมตวันที่เป็นรูปแบบไทย (ปี พ.ศ.) เช่น "27 มิ.ย. 2569" */
export function formatThaiDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** ฟอร์แมตวันที่พร้อมเวลาเป็นรูปแบบไทย เช่น "27 มิ.ย. 2569 14:30" */
export function formatThaiDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = formatThaiDate(isoDate);
  const timePart = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} ${timePart} น.`;
}

/** คืนค่าคลาสสีตามทิศทางการเติบโต (บวก = สีเขียวมรกต, ลบ = สีแดงอิฐ) */
export function growthColorClass(growthRate: number): string {
  return growthRate >= 0 ? "text-positive" : "text-negative";
}

/** ฟอร์แมตอันดับ เช่น 1 -> "อันดับ 1" */
export function formatRank(rank: number): string {
  return `อันดับ ${rank}`;
}

/**
 * แสดงค่าคอมมิชชันที่ถูกต้องตาม logic ของระบบ
 * - มีข้อมูลจริงจาก Shopee Affiliate (commissionRate > 0 และ ไม่มี commissionStatus) → แสดง "%"
 * - ยังไม่มีข้อมูล → แสดง commissionStatus หรือ "รอข้อมูลค่าคอมจาก Shopee Affiliate"
 * ห้ามแสดง "0%" เพราะทำให้เข้าใจผิดว่าค่าคอมเป็น 0
 */
export function displayCommission(product: {
  commissionRate: number;
  commissionStatus?: string;
}): string {
  if (product.commissionRate > 0 && !product.commissionStatus) {
    return formatPercent(product.commissionRate);
  }
  return product.commissionStatus ?? "รอข้อมูลค่าคอมจาก Shopee Affiliate";
}

/** คืนค่า CSS class สีสำหรับค่าคอมมิชชัน: มีข้อมูลจริง = ทอง, ยังไม่มี = muted */
export function commissionColorClass(product: {
  commissionRate: number;
  commissionStatus?: string;
}): string {
  return product.commissionRate > 0 && !product.commissionStatus
    ? "text-brand-gold-hover"
    : "text-muted-foreground";
}
