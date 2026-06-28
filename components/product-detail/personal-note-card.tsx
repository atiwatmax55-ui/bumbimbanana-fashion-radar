"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PersonalNoteCardProps {
  initialNote: string;
  onSave: (note: string) => void;
}

/** ช่องเพิ่มโน้ตส่วนตัวให้สินค้า บนหน้า Product Detail (การบันทึกโน้ตจะบันทึกสินค้าไว้ในรายการที่สนใจให้อัตโนมัติ) */
export function PersonalNoteCard({ initialNote, onSave }: PersonalNoteCardProps) {
  const [note, setNote] = useState(initialNote);
  const [justSaved, setJustSaved] = useState(false);

  function handleSave() {
    onSave(note);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-5">
      <Label className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <NotebookPen className="size-4 text-brand-gold-hover" />
        โน้ตส่วนตัว
      </Label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="จดไอเดียคอนเทนต์หรือเหตุผลที่อยากเก็บสินค้านี้ไว้..."
        className="min-h-24 rounded-xl"
      />
      <div className="flex items-center gap-3">
        <Button size="sm" className="self-start rounded-full bg-brand-gold text-foreground hover:bg-brand-gold-hover" onClick={handleSave}>
          บันทึกโน้ต
        </Button>
        {justSaved ? <span className="text-xs text-positive">บันทึกแล้ว</span> : null}
      </div>
    </div>
  );
}
