interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** หัวข้อหน้าแบบมาตรฐาน ใช้ทุกหน้าเพื่อความสม่ำเสมอของดีไซน์ */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
