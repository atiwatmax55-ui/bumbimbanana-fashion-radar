"use client";

import type { ProductGoal } from "@/types/product";
import { GOAL_LABELS } from "@/lib/dashboard/aggregate";
import { cn } from "@/lib/utils";

const GOALS: ProductGoal[] = ["commission", "sales", "revenue", "growth", "interest"];

interface GoalSelectorProps {
  value: ProductGoal;
  onChange: (goal: ProductGoal) => void;
}

/** ปุ่มเลือกเป้าหมายการคัดสินค้า: ค่าคอมสูง / ยอดขายแรง / รายได้สูง / เติบโตเร็ว / คะแนนความน่าสนใจสูง */
export function GoalSelector({ value, onChange }: GoalSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="เลือกเป้าหมายการคัดสินค้า">
      {GOALS.map((goal) => {
        const isActive = value === goal;
        return (
          <button
            key={goal}
            type="button"
            onClick={() => onChange(goal)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-transparent bg-brand-gold text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-brand-cream hover:text-foreground"
            )}
            aria-pressed={isActive}
          >
            {GOAL_LABELS[goal]}
          </button>
        );
      })}
    </div>
  );
}
