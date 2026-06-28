import { Sparkles, Lightbulb, Clapperboard } from "lucide-react";
import type { ProductInsights } from "@/lib/insights/product-insights";

interface ProductInsightsCardProps {
  insights: ProductInsights;
}

/** การ์ดสรุปจุดเด่นของสินค้า เหตุผลที่น่าสนใจ และไอเดียคอนเทนต์ บนหน้า Product Detail */
export function ProductInsightsCard({ insights }: ProductInsightsCardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-brand-cream/60 p-5 sm:grid-cols-3">
      <InsightColumn icon={Sparkles} title="จุดเด่นของสินค้า" items={insights.highlights} />
      <InsightColumn icon={Lightbulb} title="เหตุผลที่น่าสนใจ" items={insights.reasons} />
      <InsightColumn icon={Clapperboard} title="เหมาะกับคอนเทนต์แบบไหน" items={insights.contentIdeas} />
    </div>
  );
}

function InsightColumn({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Sparkles;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Icon className="size-4 text-brand-gold-hover" />
        {title}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-snug text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
