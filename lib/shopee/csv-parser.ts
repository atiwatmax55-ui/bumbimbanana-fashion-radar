/**
 * Streaming CSV parser สำหรับ Shopee Product Feed
 * รองรับ quoted fields ที่มี comma/newline ข้างใน (RFC 4180)
 *
 * ใช้งาน: เรียก extractRows() ต่อเนื่องกับแต่ละ text chunk จนกว่าจะ done
 * แล้วตามด้วย extractRows(remainder, true) เพื่อจบ
 */

/** แปลง CSV row text เดียวเป็น array ของ field values */
export function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } // escaped ""
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * สกัด complete CSV rows จาก text buffer
 * - rows: rows ที่สมบูรณ์ (มีการขึ้นบรรทัดใหม่ unquoted)
 * - remainder: ส่วนที่ยังไม่สมบูรณ์ (ต่อใน chunk ถัดไป)
 *
 * เมื่อ isFinal=true จะ flush บรรทัดสุดท้ายแม้ไม่มี newline
 */
export function extractRows(
  text: string,
  isFinal: boolean,
): { rows: string[][]; remainder: string } {
  const rows: string[][] = [];
  let pos = 0;
  let lineStart = 0;
  let inQuotes = false;

  while (pos < text.length) {
    const ch = text[pos];
    if (ch === '"') {
      // ข้าม escaped quote ("")
      if (inQuotes && pos + 1 < text.length && text[pos + 1] === '"') {
        pos += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      const line = text.slice(lineStart, pos);
      if (line.trim()) rows.push(parseRow(line));
      // ข้าม CRLF เป็นคู่
      if (ch === '\r' && pos + 1 < text.length && text[pos + 1] === '\n') pos++;
      lineStart = pos + 1;
    }
    pos++;
  }

  if (isFinal) {
    const last = text.slice(lineStart).trim();
    if (last) rows.push(parseRow(last));
    return { rows, remainder: "" };
  }
  return { rows, remainder: text.slice(lineStart) };
}
