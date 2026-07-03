"use client";

import { Sparkles } from "lucide-react";
import type { OpportunityResult } from "@/lib/insights/opportunity-score";

interface OpportunityScoreCardProps {
  result: OpportunityResult;
}

export function OpportunityScoreCard({ result }: OpportunityScoreCardProps) {
  const { score, reasoning } = result;

  const colorClass =
    score >= 75
      ? "text-positive"
      : score >= 50
        ? "text-brand-gold-hover"
        : "text-muted-foreground";

  const bgClass =
    score >= 75
      ? "border-positive/30 bg-positive/5"
      : score >= 50
        ? "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
        : "border-border";

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-5 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`size-4 ${colorClass}`} />
          <h2 className="text-base font-bold text-foreground">คะแนนโอกาส (Opportunity Score)</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-3xl font-extrabold ${colorClass}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100 คะแนน</span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 75 ? "bg-positive" : score >= 50 ? "bg-brand-gold" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {reasoning.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
