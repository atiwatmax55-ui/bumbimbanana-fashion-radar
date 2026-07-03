/** ฟิลด์ที่รองรับในการนำเข้าข้อมูลค่าคอมมิชชัน Shopee Affiliate */
export type CommissionFieldKey =
  | "external_product_id"
  | "product_url"
  | "product_name"
  | "shop_name"
  | "commission_rate"
  | "commission_amount"
  | "campaign_name"
  | "channel"
  | "effective_at";

export const COMMISSION_FIELD_LABELS: Record<CommissionFieldKey, string> = {
  external_product_id: "รหัสสินค้า (เพื่อจับคู่)",
  product_url:         "ลิงก์สินค้า (เพื่อจับคู่)",
  product_name:        "ชื่อสินค้า",
  shop_name:           "ชื่อร้านค้า",
  commission_rate:     "อัตราค่าคอม (%)",
  commission_amount:   "ยอดค่าคอม (฿)",
  campaign_name:       "ชื่อแคมเปญ",
  channel:             "ช่องทาง",
  effective_at:        "วันที่อัปเดต",
};

export const REQUIRED_COMMISSION_FIELDS: CommissionFieldKey[] = ["commission_rate"];

/** คีย์เวิร์ดตรวจจับคอลัมน์ CSV/XLSX อัตโนมัติ (lowercase) */
export const COMMISSION_FIELD_PATTERNS: Record<CommissionFieldKey, string[]> = {
  external_product_id: [
    "product_id", "productid", "item_id", "itemid", "product id", "item id", "รหัสสินค้า", "รหัส",
  ],
  product_url: [
    "product_url", "producturl", "url", "link", "product link", "ลิงก์", "ลิ้งค์", "ลิงก์สินค้า",
  ],
  product_name: [
    "product_name", "productname", "name", "title", "ชื่อสินค้า", "สินค้า", "product title",
  ],
  shop_name: [
    "shop_name", "shopname", "shop", "store", "seller", "ร้านค้า", "ชื่อร้าน",
  ],
  commission_rate: [
    "commission_rate", "commissionrate", "commission rate", "commission %", "commission(%)",
    "อัตราค่าคอม", "ค่าคอม", "ค่าคอมมิชชัน",
  ],
  commission_amount: [
    "commission_amount", "commissionamount", "commission amount", "commission (thb)",
    "ยอดค่าคอม", "จำนวนค่าคอม",
  ],
  campaign_name: [
    "campaign_name", "campaign name", "campaign", "แคมเปญ", "ชื่อแคมเปญ",
  ],
  channel: [
    "channel", "platform", "ช่องทาง",
  ],
  effective_at: [
    "updated_at", "update_at", "update date", "date", "effective_at", "effective date",
    "วันที่", "วันที่อัปเดต",
  ],
};

/** โครงสร้างข้อมูลค่าคอม 1 snapshot (1 การ import) */
export interface CommissionSnapshot {
  id:                  string;
  product_id:          string | null;
  external_product_id: string | null;
  product_url:         string | null;
  product_name:        string;
  shop_name:           string | null;
  commission_rate:     number;
  commission_amount:   number | null;
  campaign_name:       string | null;
  channel:             string | null;
  source_file:         string | null;
  imported_at:         string;
  effective_at:        string | null;
}

export type ColumnMapping = Partial<Record<CommissionFieldKey, string>>;

export interface CommissionImportRequest {
  rows:       Record<string, string>[];
  mapping:    ColumnMapping;
  sourceFile: string;
}

export interface CommissionImportResponse {
  totalRows:            number;
  matchedByExtId:       number;
  matchedByUrl:         number;
  matchedByName:        number;
  unmatched:            number;
  insertedCount:        number;
  updatedProductsCount: number;
  errors?:              string[];
}

/** ตรวจจับคอลัมน์โดยอัตโนมัติจากชื่อ header ของไฟล์ */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const result: ColumnMapping = {};
  for (const [field, patterns] of Object.entries(COMMISSION_FIELD_PATTERNS) as [CommissionFieldKey, string[]][]) {
    for (const header of headers) {
      const h = header.toLowerCase().trim();
      if (patterns.some((p) => h === p || h.includes(p) || p.includes(h))) {
        result[field] = header;
        break;
      }
    }
  }
  return result;
}
