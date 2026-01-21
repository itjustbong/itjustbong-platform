import { cn } from "@/lib/utils";

interface TocProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Toc({ children, title = "📋 목차", className }: TocProps) {
  return (
    <nav
      className={cn(
        "my-8 rounded-xl border border-border/50 bg-muted/30 px-6 pt-0",
        "not-prose", // prose 스타일 제외
        className
      )}
    >
      {title && (
        <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      )}
      <div
        className={cn(
          // 목차 내부 리스트 스타일
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:my-0",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:my-0",
          "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-muted-foreground",
          // 링크 스타일 - 명확하게 표시
          "[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40",
          "[&_a]:underline-offset-4 [&_a]:transition-colors",
          "[&_a:hover]:text-primary [&_a:hover]:decoration-primary"
        )}
      >
        {children}
      </div>
    </nav>
  );
}
