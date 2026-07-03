"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatThaiDateTime } from "@/lib/utils/format";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SyncLog {
  id: string;
  inserted_count: number | null;
  updated_count: number | null;
  skipped_count: number | null;
  failed_count: number | null;
  message: string | null;
  completed_at: string | null;
}

interface ShopeeAutoSyncCardProps {
  isDev: boolean;
}

// คำนวณเวลาซิงก์ถัดไป (00:30 UTC = 07:30 เวลาไทย)
function getNextSyncTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 30, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function fetchLastLog(): Promise<SyncLog | null> {
  return fetch("/api/shopee/sync/stats")
    .then((r) => r.json() as Promise<{ lastLog: SyncLog | null }>)
    .then((d) => d.lastLog)
    .catch(() => null);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ShopeeAutoSyncCard({ isDev }: ShopeeAutoSyncCardProps) {
  const [lastLog, setLastLog] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const nextSync = getNextSyncTime();

  useEffect(() => {
    fetchLastLog()
      .then((log) => setLastLog(log))
      .finally(() => setLoading(false));
  }, []);

  async function triggerSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/shopee/sync", { method: "POST" });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setSyncMsg(`เกิดข้อผิดพลาด: ${String(data.error ?? "ไม่ทราบสาเหตุ")}`);
      } else {
        const ir = data.importResult as
          | { inserted: number; updated: number; failed: number }
          | undefined;
        if (ir) {
          setSyncMsg(
            `ซิงก์สำเร็จ — เพิ่มใหม่ ${ir.inserted.toLocaleString("th-TH")} รายการ, ` +
              `อัปเดต ${ir.updated.toLocaleString("th-TH")} รายการ` +
              (ir.failed > 0 ? `, ล้มเหลว ${ir.failed.toLocaleString("th-TH")} รายการ` : ""),
          );
        } else {
          setSyncMsg("ซิงก์เสร็จแล้ว");
        }
        fetchLastLog().then((log) => setLastLog(log));
      }
    } catch {
      setSyncMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            ซิงก์อัตโนมัติ (Auto Sync)
          </h2>
        </div>
        {isDev ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-xs"
            onClick={() => void triggerSync()}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                กำลังซิงก์...
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                อัปเดตข้อมูลตอนนี้
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
        <Field label="ตารางเวลาอัตโนมัติ" value="ทุกวัน 07:30 น. (เวลาไทย)" />
        <Field
          label="ซิงก์ถัดไป"
          value={formatThaiDateTime(nextSync.toISOString())}
          highlight
        />
        {loading ? (
          <Field label="ซิงก์ล่าสุด" value="กำลังโหลด..." />
        ) : lastLog?.completed_at ? (
          <Field label="ซิงก์ล่าสุด" value={formatThaiDateTime(lastLog.completed_at)} />
        ) : (
          <Field label="ซิงก์ล่าสุด" value="ยังไม่มีประวัติ" />
        )}
      </div>

      {lastLog ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 px-4 py-3 text-xs">
          <Stat
            icon={<CheckCircle2 className="size-3.5 text-positive" />}
            label="เพิ่มใหม่"
            value={(lastLog.inserted_count ?? 0).toLocaleString("th-TH")}
          />
          <Stat
            icon={<Clock className="size-3.5 text-brand-gold-hover" />}
            label="อัปเดต"
            value={(lastLog.updated_count ?? 0).toLocaleString("th-TH")}
          />
          <Stat
            icon={<XCircle className="size-3.5 text-muted-foreground" />}
            label="ข้าม"
            value={(lastLog.skipped_count ?? 0).toLocaleString("th-TH")}
          />
          {(lastLog.failed_count ?? 0) > 0 ? (
            <Stat
              icon={<XCircle className="size-3.5 text-negative" />}
              label="ล้มเหลว"
              value={(lastLog.failed_count ?? 0).toLocaleString("th-TH")}
              className="text-negative"
            />
          ) : null}
        </div>
      ) : null}

      {syncMsg ? (
        <p
          className={`text-xs ${
            syncMsg.startsWith("เกิดข้อผิดพลาด") || syncMsg.startsWith("ไม่")
              ? "text-negative"
              : "text-positive"
          }`}
        >
          {syncMsg}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        ซิงก์อัตโนมัติผ่าน Vercel Cron — อัปเดต Top 1,000 สินค้าแฟชั่นผู้หญิงจาก Shopee Product
        Feed โดยไม่ลบข้อมูลเก่า
        {isDev ? " (ปุ่ม 'อัปเดตข้อมูลตอนนี้' แสดงเฉพาะโหมด Development)" : ""}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-bold ${highlight ? "text-brand-gold-hover" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? "text-foreground"}`}>
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
