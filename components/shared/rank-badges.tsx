import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";

interface RankBadgesProps {
  product: Product;
  className?: string;
}

/** ป้ายแสดงอันดับยอดขาย / ค่าคอมมิชชัน / การเติบโต ของสินค้า ใช้ร่วมกันในตาราง การ์ด และหน้ารายละเอียด */
export function RankBadges({ product, className }: RankBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      <Badge variant="outline" className="border-border text-[11px] text-muted-foreground">
        อันดับยอดขาย #{product.salesRank}
      </Badge>
      <Badge variant="outline" className="border-border text-[11px] text-muted-foreground">
        อันดับค่าคอมมิชชัน #{product.commissionRank}
      </Badge>
      <Badge variant="outline" className="border-border text-[11px] text-muted-foreground">
        อันดับการเติบโต #{product.growthRank}
      </Badge>
    </div>
  );
}
