"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveProductButtonProps {
  isSaved: boolean;
  onToggle: () => void;
  size?: "sm" | "default";
  className?: string;
}

/** ปุ่มบันทึกสินค้า / ยกเลิกการบันทึกสินค้า ใช้ร่วมกันทุกหน้าที่แสดงรายการสินค้า */
export function SaveProductButton({ isSaved, onToggle, size = "sm", className }: SaveProductButtonProps) {
  return (
    <Button
      type="button"
      variant={isSaved ? "default" : "outline"}
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "gap-1.5 rounded-full",
        isSaved && "bg-brand-gold text-foreground hover:bg-brand-gold-hover",
        className
      )}
    >
      {isSaved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
      {isSaved ? "ยกเลิกการบันทึก" : "บันทึกสินค้า"}
    </Button>
  );
}
