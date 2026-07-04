"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkflowButtonProps {
  productId:     string;
  initialStatus: Product["workflowStatus"];
  className?:    string;
}

const STATUS_LABELS: Record<NonNullable<Product["workflowStatus"]>, string> = {
  radar_found:          "ค้นพบแล้ว",
  strategy_review:      "รอฝ่ายกลยุทธ์ตรวจ",
  approved_for_content: "อนุมัติทำคอนเทนต์แล้ว",
  rejected:             "ปฏิเสธแล้ว",
};

export function WorkflowButton({ productId, initialStatus, className }: WorkflowButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function update(newStatus: Product["workflowStatus"]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/workflow`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ workflow_status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setLoading(false);
    }
  }

  if (status === "approved_for_content") {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-full border border-positive/40 bg-positive/10 px-3 py-1.5 text-sm font-semibold text-positive",
        className,
      )}>
        <CheckCircle2 className="size-4 shrink-0" />
        อนุมัติทำคอนเทนต์แล้ว
      </div>
    );
  }

  if (status === "strategy_review") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock className="size-4 shrink-0" />
          รอฝ่ายกลยุทธ์ตรวจ
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-1.5 rounded-full"
          onClick={() => update("approved_for_content")}
        >
          <CheckCircle2 className="size-3.5" />
          อนุมัติ
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-1.5 rounded-full text-negative hover:text-negative"
          onClick={() => update("rejected")}
        >
          <XCircle className="size-3.5" />
          ปฏิเสธ
        </Button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        className={cn("gap-1.5 rounded-full", className)}
        onClick={() => update("strategy_review")}
      >
        <Send className="size-3.5" />
        ส่งให้ฝ่ายกลยุทธ์อีกครั้ง
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      className={cn("gap-1.5 rounded-full", className)}
      onClick={() => update("strategy_review")}
    >
      <Send className="size-3.5" />
      ส่งให้ฝ่ายกลยุทธ์ตรวจ
    </Button>
  );
}

export { STATUS_LABELS };
