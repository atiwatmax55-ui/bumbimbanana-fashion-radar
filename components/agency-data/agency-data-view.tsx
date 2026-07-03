"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { commissionColorClass, displayCommission, formatBaht, formatNumber } from "@/lib/utils/format";

interface AgencyDataViewProps {
  products: Product[];
}

const WORKFLOW_LABELS: Record<NonNullable<Product["workflowStatus"]>, string> = {
  radar_found:          "ค้นพบแล้ว",
  strategy_review:      "รอฝ่ายกลยุทธ์ตรวจ",
  approved_for_content: "อนุมัติทำคอนเทนต์",
  rejected:             "ปฏิเสธ",
};

const WORKFLOW_COLORS: Record<NonNullable<Product["workflowStatus"]>, string> = {
  radar_found:          "bg-muted text-muted-foreground",
  strategy_review:      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  approved_for_content: "bg-positive/15 text-positive",
  rejected:             "bg-negative/15 text-negative",
};

export function AgencyDataView({ products }: AgencyDataViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, Product["workflowStatus"]>>({});

  async function updateWorkflow(productId: string, status: Product["workflowStatus"]) {
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_status: status }),
      });
      if (res.ok) {
        setLocalStatuses((prev) => ({ ...prev, [productId]: status }));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const strategyReview = products.filter(
    (p) => (localStatuses[p.id] ?? p.workflowStatus) === "strategy_review",
  );
  const approved = products.filter(
    (p) => (localStatuses[p.id] ?? p.workflowStatus) === "approved_for_content",
  );

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
        <Clock className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          ยังไม่มีสินค้าที่ส่งให้ฝ่ายกลยุทธ์ —{" "}
          <Link href="/products" className="font-semibold underline underline-offset-2">
            เปิดหน้าค้นหาสินค้า
          </Link>{" "}
          แล้วกดปุ่ม &ldquo;ส่งให้ฝ่ายกลยุทธ์&rdquo; บนสินค้าที่สนใจ
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {strategyReview.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-600" />
            <h2 className="text-base font-bold text-foreground">
              รอฝ่ายกลยุทธ์ตรวจสอบ ({strategyReview.length} รายการ)
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {strategyReview.map((p) => (
              <ProductAgencyCard
                key={p.id}
                product={p}
                currentStatus={localStatuses[p.id] ?? p.workflowStatus}
                updating={updatingId === p.id}
                onApprove={() => updateWorkflow(p.id, "approved_for_content")}
                onReject={() => updateWorkflow(p.id, "rejected")}
              />
            ))}
          </div>
        </section>
      ) : null}

      {approved.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-positive" />
            <h2 className="text-base font-bold text-foreground">
              อนุมัติทำคอนเทนต์แล้ว ({approved.length} รายการ)
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {approved.map((p) => (
              <ProductAgencyCard
                key={p.id}
                product={p}
                currentStatus={localStatuses[p.id] ?? p.workflowStatus}
                updating={updatingId === p.id}
                onApprove={undefined}
                onReject={() => updateWorkflow(p.id, "rejected")}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProductAgencyCard({
  product,
  currentStatus,
  updating,
  onApprove,
  onReject,
}: {
  product: Product;
  currentStatus: Product["workflowStatus"];
  updating: boolean;
  onApprove: (() => void) | undefined;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4">
      <Image
        src={product.productImage}
        alt={product.productName}
        width={80}
        height={80}
        className="size-20 shrink-0 rounded-xl border border-border object-cover"
      />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[11px]">
            {product.category}
          </Badge>
          {currentStatus ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${WORKFLOW_COLORS[currentStatus]}`}
            >
              {WORKFLOW_LABELS[currentStatus]}
            </span>
          ) : null}
        </div>
        <Link href={`/products/${product.id}`} className="text-sm font-semibold hover:underline">
          {product.productName}
        </Link>
        <span className="text-xs text-muted-foreground">{product.shopName}</span>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>ราคา <strong className="text-foreground">{formatBaht(product.price)}</strong></span>
          <span>
            ค่าคอม{" "}
            <strong className={commissionColorClass(product)}>
              {displayCommission(product)}
            </strong>
          </span>
          <span>ยอดขายสะสม <strong className="text-foreground">{formatNumber(product.sales30d)} ชิ้น</strong></span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {onApprove ? (
            <Button
              size="sm"
              disabled={updating}
              className="gap-1.5 rounded-full bg-positive text-white hover:bg-positive/80"
              onClick={onApprove}
            >
              <CheckCircle2 className="size-3.5" />
              อนุมัติทำคอนเทนต์
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={updating}
            className="rounded-full"
            onClick={onReject}
          >
            ปฏิเสธ
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            render={<Link href={`/products/${product.id}`} />}
            nativeButton={false}
          >
            ดูรายละเอียด
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
