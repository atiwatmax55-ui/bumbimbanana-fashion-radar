# แผนงาน TikTok Manual + CSV Import (จัดทำโดย Fable 5 — ให้ Sonnet 5 ลงมือทำ)

> เอกสารนี้เป็นแผนงานฉบับเต็มสำหรับสร้าง workflow นำเข้าสินค้า TikTok Shop ด้วยมือ + CSV (ไฟล์ตารางข้อมูล)
> ผู้วางแผน: Claude Fable 5 (อ่านโค้ดจริงทั้งหมดแล้ว ณ 2026-07-10)
> ผู้ลงมือทำโค้ด: Claude Code / Sonnet 5 ใน VS Code
> ผู้เก็บข้อมูล: Codex ในบทบาท Data Scout (ผู้สำรวจข้อมูล) ผ่าน computer-use (การควบคุมหน้าจอ)
> อ้างอิง: `docs/WORK_ORDER_T1_TIKTOK_IMPORT.md`, ROADMAP.md หัวข้อ T1, CLAUDE.md/AGENTS.md

---

## กฎเหล็ก (สรุปจาก CLAUDE.md — ห้ามฝ่าฝืนทุกข้อ)

1. **ห้าม scrape TikTok** — ห้ามมีโค้ด `fetch` ไปยัง tiktok.com หรือโดเมนในเครือ ไม่ว่ากรณีใด
2. **ห้ามใช้ hidden API (ช่องทางข้อมูลลับที่ไม่เป็นทางการ)** และห้ามดักอ่าน network ของ TikTok
3. **ห้าม bypass** ระบบล็อกอิน, OTP (รหัสผ่านครั้งเดียว), CAPTCHA (แบบทดสอบกันบอท), anti-bot ทุกชนิด
4. **ห้ามสร้างข้อมูลปลอม** — ยอดขาย/ค่าคอมที่ไม่มีข้อมูลจริง ให้เว้นว่างหรือใช้สถานะ "ไม่มีข้อมูล" เท่านั้น
5. **ห้ามสร้างตาราง Supabase ใหม่** — ใช้ `public.products` เดิม โดยตั้ง `source_platform='tiktok'`
6. **ห้าม hardcode secret/API key** — ค่าลับอยู่ใน environment variable (ตัวแปรสภาพแวดล้อม) ฝั่งเซิร์ฟเวอร์เท่านั้น
7. ทุกข้อความบน UI เป็นภาษาไทย คำอังกฤษต้องมีคำอธิบายไทยในวงเล็บ / เงินเป็นบาท (฿) ผ่าน `lib/utils/format.ts`

---

## 1. สรุปสิ่งที่อ่านเจอจากโค้ดปัจจุบัน

### โครงสร้างที่มีอยู่และใช้ต่อได้ทันที

- **Repository Pattern (รูปแบบตัวจัดการข้อมูลกลาง)**: UI ทุกหน้า import จาก
  `lib/data-source/product-repository.ts` จุดเดียว ปัจจุบันเลือกโหมด mock / windsor / shopee
  ตาม `DATA_SOURCE_MODE` — โหมด shopee อ่าน `public.products` where `source_platform='shopee'`
- **แท็บ TIKTOK SHOP มีอยู่แล้ว**: `components/shared/platform-switch.tsx` มี `PlatformKey = "all" | "shopee" | "tiktok"`
  และ `filterByPlatform()` กรองจากฟิลด์ `source` ของสินค้า — แค่มีข้อมูล `source: "tiktok"` เข้าระบบ แท็บนี้จะทำงานเอง
- **ตาราง `public.products` รองรับอยู่แล้ว** (migration `0004_shopee_in_products.sql`): มีคอลัมน์
  `source_platform`, `external_product_id`, `source_item_id`, `item_sold`, `commission_rate` (nullable),
  `commission_status`, `category`, `product_image`, `product_url`, `imported_at`, `last_seen_at` ครบ — **ไม่ต้องสร้างตารางใหม่**
- **ระบบ snapshot รายวัน** (migration `0008_sales_snapshots.sql`): ตาราง `product_sales_snapshots`
  PK `(product_id, snapshot_date)` รองรับ product ทุกแพลตฟอร์ม — ฟังก์ชัน `writeDailySnapshots()`
  ใน `app/api/shopee/import/route.ts:481` เป็นต้นแบบที่ลอกได้เกือบตรง ๆ
- **ต้นแบบ normalize + validate**: `lib/shopee/normalize-row.ts` (แปลง raw → row ที่ upsert ได้, ทุก NOT NULL มี fallback)
  และ `parseRate`/`parseAmount` ใน `app/api/commission/import/route.ts:12-23` (strip `%`, `,`, `฿` ก่อน parse)
- **ต้นแบบ UI import**: `components/commission-import/commission-import-view.tsx`
  (ขั้นตอน upload → preview/map → result พร้อมสรุปจำนวน) และ `app/commission-import/page.tsx`
- **ยูทิลิตีที่ต้อง reuse**: `getCategoryPlaceholderImage` (`lib/data-source/category-image.ts`),
  `getSupabaseServerClient` / `isSupabaseConfigured` (`lib/supabase/server.ts`), `lib/utils/format.ts`,
  ตาราง `import_logs` (มีอยู่แล้วจาก 0004)

### จุดที่ต้องแก้/ต้องระวังที่พบจากการอ่านโค้ด

- `types/product.ts:62` — `source?: "shopee"` ต้องขยายเป็น `"shopee" | "tiktok"`
- `platform-switch.tsx:54-61` — generic ของ `filterByPlatform` ผูกกับ `{ source?: "shopee" }`
  และมี cast `(p.source as string | undefined)` ที่ต้องลบออกเมื่อขยาย type แล้ว
- **ความไม่ตรงกันของ unique index**: migration 0004 สร้าง unique index บน
  `(source_platform, external_product_id)` แต่ shopee route upsert ด้วย
  `onConflict: "source_platform,source_item_id"` — แปลว่ามี unique index บน `source_item_id`
  อยู่ใน migration อื่นหรือใน DB จริง **Sonnet 5 ต้องตรวจสอบก่อนเลือก onConflict** (ดูข้อ 9)
  ทางปลอดภัยคือ set ทั้ง `source_item_id` และ `external_product_id` เป็นค่าเดียวกันแบบที่
  `normalize-row.ts` ทำอยู่
- `SHOPEE_SELECT` ใน `lib/data-source/shopee-product-repository.ts:40` **ไม่มี** `commission_rate`
  — สินค้า tiktok เก็บ % ค่าคอมตรงในแถว products (ไม่ผ่าน commission_snapshots) จึงต้องเพิ่มคอลัมน์นี้ใน select
- `passesWomenApparelFilter()` (`shopee-product-repository.ts:93`) กรองหมวดตาม taxonomy ของ Shopee
  — **ห้ามเอาไปกรองแถว tiktok** (คัดด้วยมือแล้ว และหมวดจาก TikTok ไม่ตรง taxonomy Shopee → สินค้าจะหายเงียบ ๆ)
- `brand.md` (โทนครีม/ทอง) **เก่ากว่า** redesign ปัจจุบัน (ขาว/ดำ/เทา + Lime, ฟอนต์ Anton/Archivo
  ตาม commit `a5dd3a1`) — ให้ยึดสไตล์ของ component ที่มีอยู่จริงในโค้ดเป็นหลัก
- Windsor.ai ใช้กับ TikTok Shop ไทยไม่ได้ (ยืนยันแล้วใน ROADMAP) — T1 manual import คือทางเดียวที่ใช้ได้จริงตอนนี้
- Repository มี module cache อายุ 60 วินาที (`shopee-product-repository.ts:47-48`) — สินค้าที่เพิ่ง import
  อาจยังไม่ขึ้นหน้าเว็บทันที

---

## 2. Workflow (ลำดับการทำงานทั้งเส้น)

```
แม็ก (เจ้าของเว็บ)
  │ 1. ล็อกอิน TikTok Shop Creator Center ด้วยตัวเอง (Codex ห้ามแตะขั้นตอนนี้)
  ▼
Claude Code
  │ 2. ออก prompt (คำสั่งงาน) ให้ Codex ตามแบบในหัวข้อ 4
  ▼
Codex Data Scout (computer-use)
  │ 3. อ่านข้อมูลที่ "มองเห็นบนหน้าจอ" ของบัญชีแม็กเท่านั้น
  │ 4. ส่งออกเป็น CSV/JSON ตาม data contract หัวข้อ 5
  ▼
แม็ก
  │ 5. วางข้อความ CSV (หรือ JSON) ลงหน้า /tiktok-import
  ▼
เว็บ (โค้ดที่ Sonnet 5 สร้าง)
  │ 6. validate ฝั่ง client → แสดง preview (ตารางตัวอย่าง) ไฮไลต์แถวผิดพร้อมเหตุผลไทย
  │ 7. กดยืนยัน → POST /api/tiktok/import
  ▼
API route (ฝั่งเซิร์ฟเวอร์)
  │ 8. validate ซ้ำ → upsert public.products (source_platform='tiktok')
  │ 9. เขียน product_sales_snapshots (1 แถว/สินค้า/วัน) + บันทึก import_logs
  ▼
หน้าเว็บ
  10. แท็บ TIKTOK SHOP หน้าแรกแสดงสินค้าเองทันทีผ่าน filterByPlatform เดิม
      (อันดับคำนวณรวมทุกแพลตฟอร์มผ่าน compute-ranks.ts เหมือนเดิม)
```

หมายเหตุ: ขั้น 3–4 เทียบเท่า "แม็กจดข้อมูลจากจอด้วยตาตัวเองแล้วพิมพ์ลงตาราง" เพียงแต่ให้ Codex
ช่วยจด — ไม่ใช่การ scrape เพราะไม่มีการยิง request อัตโนมัติ ไม่อ่าน network ไม่ข้ามระบบป้องกันใด ๆ

---

## 3. ขอบเขตงานของ Codex Data Scout

### ทำได้ (อยู่ในขอบเขต)

- อ่านค่าที่ **แสดงบนหน้าจอ** ของ TikTok Shop Creator Center (ศูนย์ครีเอเตอร์) ในบัญชีที่แม็กล็อกอินไว้แล้ว:
  ชื่อสินค้า, ราคา, % ค่าคอมมิชชัน, ยอดขายที่แสดง, ชื่อร้าน, หมวดหมู่
- คัดลอกลิงก์สินค้าจาก address bar (ช่องที่อยู่เว็บ) หรือปุ่ม "คัดลอกลิงก์" ที่หน้าเว็บมีให้ตามปกติ
- เลื่อนหน้า คลิกเมนู เปลี่ยนแท็บ — การใช้งานเว็บแบบผู้ใช้ปกติทุกอย่าง
- แปลงตัวเลขแบบย่อที่เห็นบนจอ ("1.2พัน", "10K+", "1.5หมื่น") เป็นจำนวนเต็ม
  พร้อมจดหมายเหตุว่าเป็น **ค่าประมาณ** (เช่น "10K+" → 10000 หมายเหตุ "ขั้นต่ำ")

### ห้ามทำ (นอกขอบเขตเด็ดขาด)

- ห้ามล็อกอินแทน กรอกรหัสผ่าน กรอก OTP หรือแก้ CAPTCHA ทุกกรณี — ถ้าเจอหน้าล็อกอิน/ยืนยันตัวตน ให้หยุดและแจ้งแม็ก
- ห้ามเรียก API / fetch / curl ใด ๆ ไปยัง tiktok.com หรือโดเมนในเครือ
- ห้ามเปิด DevTools (เครื่องมือนักพัฒนา) เพื่อดักอ่าน network หรือใช้ hidden API
- ห้ามเดา แต่ง หรือประมาณตัวเลขที่ **ไม่เห็นบนจอ** — ช่องไหนไม่เห็นให้เว้นว่าง
- ห้ามเก็บ/ส่งภาพหน้าจอที่มีข้อมูลบัญชี ยอดเงิน หรือข้อมูลส่วนตัวอื่นของแม็ก
- ห้ามกดปุ่มที่เปลี่ยนสถานะบัญชี (สมัครแคมเปญ, ขอ sample, ส่งข้อความหาผู้ขาย ฯลฯ) — งานนี้อ่านอย่างเดียว

---

## 4. Prompt สำหรับ Claude Code ใช้สั่ง Codex Data Scout

คัดลอกข้อความด้านล่างไปใช้ได้เลย (แก้จำนวนสินค้า/หมวดตามต้องการ):

```
คุณคือ Data Scout (ผู้สำรวจข้อมูล) ทำงานผ่าน computer-use บนหน้าจอของฉัน

บริบท: ฉันเป็นครีเอเตอร์ TikTok Shop และล็อกอิน TikTok Shop Creator Center
(ศูนย์ครีเอเตอร์) ไว้เรียบร้อยแล้ว หน้าจอที่เปิดอยู่คือ "ตลาดสินค้า" (Product Marketplace)
ของบัญชีฉันเอง งานของคุณคือ "จดข้อมูลที่เห็นบนจอ" แทนสายตาฉัน — ไม่ใช่การ scrape

งาน: จดข้อมูลสินค้าแฟชั่นผู้หญิงที่น่าสนใจ 20 ตัวแรกจากหน้าที่เปิดอยู่
ต่อสินค้า 1 ตัว เก็บ: ชื่อสินค้า, ราคา (บาท), % ค่าคอมมิชชัน, ลิงก์สินค้า
(จากปุ่มคัดลอกลิงก์หรือ address bar), ลิงก์รูป (ถ้าคัดลอกได้จากหน้าจอ),
ยอดขายที่แสดง, หมวดหมู่, ชื่อร้าน

กติกาห้ามฝ่าฝืน:
1. ห้ามล็อกอิน/กรอก OTP/แก้ CAPTCHA — เจอเมื่อไหร่ให้หยุดแล้วบอกฉัน
2. ห้ามเรียก API หรือ fetch ใด ๆ ไป tiktok.com — อ่านจากจอเท่านั้น
3. ห้ามเปิด DevTools หรือดักอ่าน network
4. ห้ามเดาตัวเลขที่ไม่เห็นบนจอ — เว้นว่างแทน
5. ห้ามกดปุ่มที่เปลี่ยนสถานะบัญชี (สมัครแคมเปญ ขอ sample ส่งข้อความ)

กติกาข้อมูล:
- ตัวเลขเป็นจำนวนล้วน ไม่มี comma ไม่มี % ไม่มี ฿ (เช่น 259 ไม่ใช่ "259.-")
- ยอดขายแบบย่อ ("1.2พัน", "10K+") ให้แปลงเป็นจำนวนเต็ม (1200, 10000)
  แล้วจดหมายเหตุท้ายงานว่าตัวไหนเป็นค่าประมาณ
- ลิงก์ต้องเป็น URL เต็มขึ้นต้น https://
- หมวดหมู่เลือกจาก: กางเกงยีนส์, กางเกงขากระบอก, เสื้อครอป, เสื้อเชิ้ต, เดรส,
  กระโปรง, ชุดเซ็ต, เสื้อออกกำลังกาย, รองเท้า, กระเป๋า, อื่นๆ
  (ถ้าไม่ตรงหมวดไหนเลย ใช้ "อื่นๆ")

รูปแบบผลลัพธ์: ส่งเป็น CSV บรรทัดแรกเป็น header ตามนี้เป๊ะ ๆ
ชื่อสินค้า,ราคา,ค่าคอม(%),ลิงก์สินค้า,ลิงก์รูป,ยอดขายโดยประมาณ,หมวดหมู่,ชื่อร้าน
(ช่องที่ไม่มีข้อมูลให้เว้นว่าง ห้ามใส่ "-" หรือ "N/A")
ถ้าชื่อสินค้ามี comma ให้ครอบด้วยเครื่องหมายคำพูด "..."
```

---

## 5. Data contract (ข้อตกลงรูปแบบข้อมูล) ระหว่าง Codex กับ Sonnet 5

### 5.1 CSV header ภาษาไทย (ลำดับตายตัว)

```
ชื่อสินค้า,ราคา,ค่าคอม(%),ลิงก์สินค้า,ลิงก์รูป,ยอดขายโดยประมาณ,หมวดหมู่,ชื่อร้าน
```

- คั่นด้วย comma หรือ tab ก็ได้ (รองรับการวางจาก Excel/Google Sheets ซึ่งเป็น tab)
- ช่องที่มี comma ในเนื้อหา (เช่นชื่อสินค้า) ครอบด้วย `"..."`

| คอลัมน์ | บังคับ | ชนิด | กติกา |
|---|---|---|---|
| ชื่อสินค้า | ✅ | ข้อความ | ห้ามว่าง |
| ราคา | ✅ | ตัวเลข | > 0 หน่วยบาท |
| ค่าคอม(%) | ✅ | ตัวเลข | 0–100 |
| ลิงก์สินค้า | ✅ | URL | ต้องขึ้นต้น `https://` — ใช้เป็น key กันซ้ำ |
| ลิงก์รูป | ❌ | URL | ขึ้นต้น `https://` ถ้าไม่มี/ไม่ถูก → ใช้รูป placeholder ตามหมวด |
| ยอดขายโดยประมาณ | ❌ | จำนวนเต็ม ≥ 0 | ว่าง = 0 (คือ "ยังไม่มีข้อมูล" ไม่ใช่ขายไม่ได้) |
| หมวดหมู่ | ❌ | ข้อความ | ต้องเป็นค่าใน `PRODUCT_CATEGORIES` — ไม่ตรง → "อื่นๆ" + แจ้งเตือน |
| ชื่อร้าน | ❌ | ข้อความ | ว่างได้ |

### 5.2 JSON shape (โครงสร้าง JSON — ทางเลือกที่สอง)

```json
{
  "items": [
    {
      "productName": "เดรสลายดอก คอวี แขนสั้น",
      "price": 259,
      "commissionRate": 15,
      "productUrl": "https://shop.tiktok.com/...",
      "productImage": "https://... หรือ null",
      "estimatedSold": 1200,
      "category": "เดรส",
      "shopName": "ร้านตัวอย่าง"
    }
  ]
}
```

- ฟิลด์บังคับ/กติกาเหมือนตาราง CSV ทุกประการ (`productImage`, `estimatedSold`, `category`, `shopName` เป็น optional)
- API route รับ JSON shape นี้เป็น request body โดยตรง — โหมด CSV ให้ฝั่ง client parse เป็น shape นี้ก่อนส่ง

---

## 6. แผนไฟล์ที่ Sonnet 5 ต้องแก้/สร้าง

### ไฟล์ที่ต้องแก้

| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `types/product.ts` | บรรทัด ~62: `source?: "shopee"` → `source?: "shopee" \| "tiktok"` + ปรับ comment |
| `components/shared/platform-switch.tsx` | generic ของ `filterByPlatform` เป็น `{ source?: "shopee" \| "tiktok" }`, ลบ cast `as string \| undefined`, ปรับ comment หัว component ที่บอกว่า "TikTok Shop ยังไม่มีข้อมูล" |
| `lib/data-source/shopee-product-repository.ts` | query เป็น `.in("source_platform", ["shopee", "tiktok"])`, เพิ่ม `source_platform` + `commission_rate` ใน SELECT, map `source` ตามค่าจริงของแถว, **ข้าม** `passesWomenApparelFilter` สำหรับแถว tiktok, แถว tiktok อ่าน `commission_rate` จากคอลัมน์ตรง (ไม่ใช่ commission_snapshots), ปรับข้อความ `getDataSyncStatus` ให้นับรวม/แยกจำนวนต่อแพลตฟอร์ม |
| `components/layout/nav-items.ts` | เพิ่มรายการ `/tiktok-import` (label สั้น ๆ เช่น "นำเข้า TikTok") — พิจารณาใส่ `SECONDARY_NAV_ITEMS` ถ้า Bottom Nav มือถือแน่นเกิน 5 ช่อง |
| `ROADMAP.md` | ติ๊ก checkbox ของ T1 ที่ทำเสร็จ |

### ไฟล์ที่ต้องสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/tiktok/normalize-tiktok-item.ts` | validate 1 รายการตาม contract ข้อ 5 + สกัด product id จากลิงก์ (ถ้าสกัดไม่ได้ ใช้ URL เต็ม normalize แล้วเป็น key) + แปลงเป็น row สำหรับ upsert (ตั้ง `source_item_id` = `external_product_id` = key เดียวกัน, `data_source: "tiktok_manual"`, `commission_rate` เป็นตัวเลขจริง, `commission_status: null`) — คืน `{ ok, row } \| { ok: false, reason }` ตามแบบ `normalize-row.ts` |
| `lib/tiktok/parse-csv-input.ts` (หรือรวมในไฟล์บน) | แปลงข้อความที่วาง (comma/tab) → รายการ item + ตำแหน่งแถวที่ผิด |
| `app/api/tiktok/import/route.ts` | POST: ตรวจ `isSupabaseConfigured` → validate ซ้ำ → upsert `public.products` (batch) → `writeDailySnapshots` แบบเดียวกับ shopee → บันทึก `import_logs` ด้วย `source: "tiktok_manual"` → ตอบสรุป เพิ่มใหม่/อัปเดต/ข้าม พร้อมเหตุผล |
| `app/tiktok-import/page.tsx` | หน้า server component ห่อ view + metadata ภาษาไทย |
| `components/tiktok-import/tiktok-import-view.tsx` | client component หลัก: สลับ 2 โหมด (ฟอร์มทีละตัว / วาง CSV), state, เรียก API |
| `components/tiktok-import/` (ย่อยตามสมควร) | เช่น `single-item-form.tsx`, `csv-paste-panel.tsx`, `import-preview-table.tsx`, `import-result-summary.tsx` — ตามหลัก 1 ไฟล์ = 1 หน้าที่ |

### ของเดิมที่ต้อง reuse (ห้ามเขียนใหม่)

- `getCategoryPlaceholderImage` — `lib/data-source/category-image.ts`
- `getSupabaseServerClient` / `isSupabaseConfigured` — `lib/supabase/server.ts`
- ฟอร์แมตเงิน/ตัวเลข — `lib/utils/format.ts`
- แบบแผน `writeDailySnapshots` + `updateLog` — `app/api/shopee/import/route.ts`
- โครง UI ขั้นตอน upload → preview → result — `components/commission-import/commission-import-view.tsx`
- `PRODUCT_CATEGORIES` — `types/product.ts`

---

## 7. ลำดับงานที่ Sonnet 5 ต้องทำทีละขั้น

1. **ขยาย type**: แก้ `types/product.ts` + `platform-switch.tsx` → รัน `npm run build`
   ไล่แก้ type error ที่ตามมาจนผ่าน → commit
2. **สร้าง normalize layer**: `lib/tiktok/normalize-tiktok-item.ts` (+ parser CSV)
   พร้อม validation ครบตามหัวข้อ 8 → commit
3. **สร้าง API route**: `app/api/tiktok/import/route.ts` — **ก่อน upsert ให้ตรวจ unique index จริง**
   (ดูข้อ 9 ข้อแรก) เลือก `onConflict` ให้ตรง, เขียน snapshot + import_logs → commit
4. **สร้างหน้า `/tiktok-import`**: 2 โหมด (ฟอร์ม/วาง CSV) + preview ไฮไลต์แถวผิดพร้อมเหตุผลไทย
   + หน้าสรุปผลพร้อมลิงก์ไปหน้าแรกแท็บ TIKTOK — Mobile First ทดสอบ 375px ก่อน → commit
5. **เพิ่มเมนู**: `nav-items.ts` → commit (รวมกับข้อ 4 ได้)
6. **ปรับ repository ฝั่งอ่าน**: `shopee-product-repository.ts` อ่านทั้ง shopee+tiktok
   ตามรายละเอียดข้อ 6 → ตรวจว่าอันดับคำนวณรวมทุกแพลตฟอร์ม → commit
7. **ทดสอบปิดงาน**: รันตามหัวข้อ 11 + ทดสอบ manual ตามหัวข้อ 10 → ติ๊ก ROADMAP → commit สุดท้าย

ทุก commit ใช้ข้อความภาษาไทยตามแบบแผนใน git log เดิม

---

## 8. Validation และ edge cases (กรณีขอบ)

- **ตัวเลขมี `,` `฿` `%` ปน** ("1,290", "15%") → strip ก่อน parse ตามแบบ `parseRate`/`parseAmount`
  ใน `app/api/commission/import/route.ts`
- **ตัวเลขแบบย่อ** ("1.2K", "1.2พัน", "10K+") → reject แถวนั้นพร้อมข้อความไทย
  "กรุณาแปลงเป็นจำนวนเต็ม เช่น 1200" (Codex ถูกสั่งให้แปลงมาก่อนแล้ว — ตัวที่หลุดมาคือความผิดปกติ ไม่เดาเอง)
- **แถวซ้ำใน batch เดียว** (ลิงก์เดียวกัน) → เก็บแถวหลังสุด แจ้งใน preview ว่าแถวก่อนถูกแทนที่
- **นำเข้าซ้ำ** (สินค้าเดิม วันใหม่/วันเดิม) → upsert อัปเดตแถวเดิมใน products,
  snapshot วันเดิมถูก overwrite ตาม PK `(product_id, snapshot_date)` — ไม่มีทางเกิดแถวซ้ำ
- **ลิงก์สินค้าไม่ขึ้นต้น `https://`** → reject แถว / **ลิงก์รูปไม่ถูกต้อง** → ตัดทิ้ง ใช้
  `getCategoryPlaceholderImage` แทน (ไม่ reject)
- **หมวดไม่อยู่ใน `PRODUCT_CATEGORIES`** → map เป็น "อื่นๆ" + แสดงคำเตือนใน preview (ไม่ reject)
- **ยอดขายจาก Creator Center เป็นยอดสะสม** → เก็บลงคอลัมน์ `item_sold` (ความหมายเดียวกับ shopee)
  **ห้าม** เขียนลง `sales_7d`/`sales_30d` ตรง ๆ — ให้ระบบ snapshot + `radar_baselines` คำนวณยอดรายช่วงเอง
- **ค่าคอม 0** → เก็บ 0 ได้ (เป็นข้อมูลจริงที่ผู้ใช้กรอก) — ต่างจาก shopee ที่ไม่มีข้อมูลจึงใช้ `commission_status`
- **Supabase ไม่ได้ตั้งค่า** → ตอบ 503 พร้อมข้อความไทยแบบเดียวกับ shopee route
- **วางข้อความว่าง / มีแต่ header** → แจ้ง "ไม่พบข้อมูลสินค้า" ไม่เรียก API
- **ชื่อสินค้ามี comma** → parser ต้องรองรับ `"..."` (ดูตัวช่วยใน `lib/shopee/csv-parser.ts` ก่อนเขียนใหม่)

---

## 9. จุดเสี่ยงที่ต้องระวัง

1. **onConflict ไม่ตรง unique index จริง** → upsert ล้มทั้ง batch หรือเกิดแถวซ้ำ
   — ก่อนเขียน route ให้ grep migrations ทั้งโฟลเดอร์หา unique index บน `source_item_id`
   ถ้าไม่พบ ให้ใช้ `onConflict: "source_platform,external_product_id"` (ตรงกับ 0004)
   และ set สองคอลัมน์ให้ค่าเดียวกันเสมอ
2. **women-fashion filter กินแถว tiktok** → สินค้าที่ import แล้วหายจากหน้าเว็บแบบเงียบ ๆ
   — เงื่อนไขกรองต้องเช็ค `source_platform === "shopee"` ก่อนเรียก filter
3. **ห้ามมี fetch ไป tiktok.com ฝั่งเซิร์ฟเวอร์** แม้แต่เพื่อ validate ลิงก์รูป — เก็บ URL เฉย ๆ
   ให้เบราว์เซอร์ผู้ใช้โหลดเอง; ตรวจว่ารูปสินค้าแสดงผ่าน `<img>` ธรรมดาแบบที่ shopee ใช้
   ถ้าใช้ `next/image` ต้องเพิ่ม `remotePatterns` — ทางง่ายคือใช้แบบเดียวกับ shopee
4. **Module cache 60 วินาที** ใน repository → หลัง import สินค้าอาจยังไม่ขึ้นหน้าแรกทันที
   — อย่างน้อยต้องเขียนบอกในหน้าสรุปผล ("อาจใช้เวลาสูงสุด 1 นาที") หรือ export ฟังก์ชัน
   invalidate cache ให้ API route เรียก
5. **ห้ามแต่งข้อมูล**: ช่องที่ผู้ใช้ไม่กรอก = 0 หรือ null เท่านั้น ห้าม default เป็นค่าที่ดูสมจริง
6. **ภาษา/แบรนด์**: ทุกข้อความไทย + วงเล็บอธิบายคำอังกฤษ, สไตล์ UI ตาม component ปัจจุบัน
   (ขาว/ดำ/เทา + Lime) **ไม่ใช่** โทนครีม/ทองใน brand.md เดิม — ดู `commission-import-view.tsx`
   ประกอบแต่ระวังว่ามันยังใช้ class `brand-gold`/`brand-cream` เดิมอยู่ ให้ดูหน้าที่ redesign แล้ว
   (เช่น `app/page.tsx`) เป็นหลัก
7. **อย่าให้ DataSyncStatus โกหก**: ถ้าเพิ่ม tiktok เข้าระบบแล้ว ข้อความ/จำนวนในหน้า
   `/data-status` ต้องสะท้อนทั้งสองแพลตฟอร์ม (type `DataSyncStatus.source` อาจต้องขยาย —
   แก้เท่าที่จำเป็น อย่ารื้อ)

---

## 10. Acceptance criteria (เกณฑ์ตรวจรับงาน)

- [ ] นำเข้าสินค้าโหมดฟอร์ม 1 ตัว + โหมด CSV อย่างน้อย 2 แถว สำเร็จ เห็นสรุป เพิ่มใหม่/อัปเดต/ข้าม ถูกต้อง
- [ ] หน้าแรก แท็บ TIKTOK SHOP แสดงสินค้าที่นำเข้าครบ (แท็บ "ทั้งหมด" ก็เห็นรวมกับ shopee)
- [ ] นำเข้าสินค้าตัวเดิมซ้ำด้วยยอดขายใหม่ → แถวเดิมถูกอัปเดต ไม่เกิดแถวซ้ำใน `public.products`
- [ ] มีแถวใหม่ใน `product_sales_snapshots` ของสินค้า tiktok (1 แถว/สินค้า/วัน)
- [ ] แถว CSV ที่ผิด (ราคาติดลบ, ลิงก์ไม่ใช่ https, ค่าคอม > 100) ถูกไฮไลต์ใน preview พร้อมเหตุผลภาษาไทย และไม่ถูกนำเข้า
- [ ] สินค้า tiktok แสดง % ค่าคอมจริงที่กรอก (ไม่ขึ้น "รอข้อมูลค่าคอมจาก Shopee Affiliate")
- [ ] สินค้า shopee เดิมยังแสดงครบเหมือนก่อนแก้ (จำนวนไม่ลด ค่าคอมไม่เพี้ยน)
- [ ] จอมือถือ 375px: ฟอร์ม + ตาราง preview ไม่ล้นจอ ใช้งานได้จริง
- [ ] ไม่มีข้อความอังกฤษบน UI ที่ไม่มีวงเล็บอธิบายไทย / เงินเป็น ฿ ผ่าน `lib/utils/format.ts`
- [ ] เมนู navigation มีลิงก์เข้า `/tiktok-import`
- [ ] `grep -ri "tiktok.com" app lib components` ไม่พบ fetch/request ใด ๆ ไปยัง TikTok
- [ ] `npm run lint` และ `npm run build` ผ่านทั้งคู่

## 11. คำสั่งทดสอบที่ Sonnet 5 ต้องรัน

```bash
npm run lint     # ตรวจ ESLint ต้องไม่มี error
npm run build    # build production ต้องผ่าน
npm run dev      # ทดสอบ manual ตามหัวข้อ 10 (import จริง 2 โหมด + ดูแท็บ TIKTOK)
```

## 12. Checklist ก่อนส่งงานให้แม็ก

- [ ] เกณฑ์ตรวจรับหัวข้อ 10 ผ่านครบทุกข้อ (ติ๊กทีละข้อ ห้ามข้าม)
- [ ] `npm run lint` + `npm run build` ผ่าน (แนบผลรันใน commit message สุดท้ายหรือรายงาน)
- [ ] ไม่มีไฟล์ `.env*` หรือ secret ใด ๆ ถูก commit / ไม่มี key ใหม่ hardcode ในโค้ด
- [ ] ไม่มีโค้ด fetch ไป tiktok.com (ยืนยันด้วย grep ตามหัวข้อ 10)
- [ ] แถว tiktok ไม่โดน women-fashion filter (ทดสอบด้วยสินค้าหมวด "อื่นๆ" 1 ตัว)
- [ ] ROADMAP.md ติ๊ก checkbox T1 ที่เสร็จแล้ว
- [ ] commit แยกตามลำดับงานหัวข้อ 7 ข้อความภาษาไทยตามแบบแผน git log เดิม
- [ ] เขียนสรุปสั้น ๆ ให้แม็ก: ทำอะไรไปบ้าง, วิธีใช้หน้า /tiktok-import, ข้อจำกัดที่เหลือ (ข้อมูลอัปเดตด้วยมือ — เหมาะกับติดตามสินค้า 20–50 ตัว ไม่ใช่ทั้งตลาด)
