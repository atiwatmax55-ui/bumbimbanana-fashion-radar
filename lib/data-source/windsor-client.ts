/**
 * ตัวเรียก Windsor.ai REST API ฝั่งเซิร์ฟเวอร์เท่านั้น (Server-only)
 *
 * ไฟล์นี้รู้จักแค่การคุยกับ Windsor.ai (auth, URL, error) ไม่รู้จักโครงสร้าง
 * Product ของเรา — การแปลงข้อมูลอยู่ที่ lib/data-source/windsor-field-map.ts
 * เพื่อแยกความรับผิดชอบให้ทดสอบ/แก้ไขแต่ละส่วนได้อิสระจากกัน
 *
 * ห้าม import ไฟล์นี้จาก component ที่มี "use client" เด็ดขาด เพราะใช้
 * WINDSOR_API_KEY ซึ่งต้องไม่หลุดไปอยู่ฝั่งเบราว์เซอร์ (ตามกฎข้อ 7 ของโปรเจกต์)
 */

const WINDSOR_CONNECTOR_ID = "tiktok_shop";
const WINDSOR_BASE_URL = "https://connectors.windsor.ai";

/** ความถี่ในการดึงข้อมูลใหม่จาก Windsor.ai (วินาที) — ข้อมูลนี้ไม่จำเป็นต้อง real-time */
export const WINDSOR_REVALIDATE_SECONDS = 3600;

export class WindsorApiError extends Error {}

export type WindsorRow = Record<string, string | number | boolean | null>;

interface FetchWindsorRowsParams {
  fields: string[];
  dateFrom: string;
  dateTo: string;
}

/**
 * ดึงข้อมูลดิบระดับ order/SKU จาก Windsor.ai connector "tiktok_shop"
 *
 * หมายเหตุ (Phase B — ต้องยืนยันหลังเชื่อมต่อบัญชีจริง): โครงสร้าง JSON ที่ Windsor.ai
 * ตอบกลับจริงอาจเป็น array ตรงๆ หรือห่อด้วย { data: [...] } — ฟังก์ชันนี้รองรับทั้งสองแบบไว้ก่อน
 * ควรตรวจสอบรูปแบบจริงผ่าน curl หรือ get_data ก่อนเขียน mapping ใน windsor-field-map.ts
 */
export async function fetchWindsorRows({
  fields,
  dateFrom,
  dateTo,
}: FetchWindsorRowsParams): Promise<WindsorRow[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    throw new WindsorApiError(
      "ไม่พบ WINDSOR_API_KEY ในตัวแปรสภาพแวดล้อม โปรดตั้งค่าใน .env.local (ดู .env.example) ก่อนใช้งานโหมด Windsor.ai"
    );
  }

  const url = new URL(`${WINDSOR_BASE_URL}/${WINDSOR_CONNECTOR_ID}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("fields", fields.join(","));
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      next: { revalidate: WINDSOR_REVALIDATE_SECONDS },
    });
  } catch {
    throw new WindsorApiError("ไม่สามารถเชื่อมต่อ Windsor.ai ได้ (เครือข่ายผิดพลาด)");
  }

  if (!response.ok) {
    throw new WindsorApiError(
      `Windsor.ai API ตอบกลับผิดพลาด (HTTP ${response.status}) — ตรวจสอบว่าบัญชี TikTok Shop ยังเชื่อมต่ออยู่และ API Key ยังใช้งานได้`
    );
  }

  const payload: unknown = await response.json();
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : null;

  if (!rows) {
    throw new WindsorApiError("รูปแบบข้อมูลที่ได้จาก Windsor.ai ไม่ตรงตามที่คาดไว้");
  }

  return rows as WindsorRow[];
}
