import { compileMDXContent } from "@/lib/mdx";
import { cn } from "@/lib/utils";
import { mdxComponents } from "./MDXComponents";

interface PostContentProps {
  content: string;
  className?: string;
}

export async function PostContent({ content, className }: PostContentProps) {
  const { content: mdxContent } = await compileMDXContent(content, mdxComponents);

  return (
    <article
      className={cn(
        "prose prose-base dark:prose-invert max-w-none md:prose-lg",
        // Typography optimization
        "prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight",
        // H1 style
        "prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:leading-tight md:prose-h1:text-4xl",
        // H2 style - clean separator
        "prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-h2:pb-2 md:prose-h2:text-3xl",
        "prose-h2:border-b prose-h2:border-border/40",
        // H3 style
        "prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-8 md:prose-h3:text-2xl",
        // H4 style
        "prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-6 md:prose-h4:text-xl",
        // Paragraph style - better readability
        "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:mb-5 prose-p:mt-0 md:prose-p:text-base",
        "prose-p:text-foreground/80",
        // Link style
        "prose-a:text-primary prose-a:font-medium",
        "prose-a:underline prose-a:decoration-primary/40 prose-a:underline-offset-4",
        "hover:prose-a:decoration-primary",
        // List style
        "prose-ul:my-5 prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1.5",
        "prose-ol:my-5 prose-ol:list-decimal prose-ol:pl-5 prose-ol:space-y-1.5",
        "prose-li:my-0 prose-li:text-foreground/80 prose-li:leading-[1.7]",
        // Blockquote style - minimal
        "prose-blockquote:border-l-2 prose-blockquote:border-primary/50",
        "prose-blockquote:bg-transparent prose-blockquote:pl-4 prose-blockquote:pr-0",
        "prose-blockquote:py-0 prose-blockquote:my-6",
        "prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
        // Inline code style
        "prose-code:text-[13px] prose-code:bg-muted prose-code:text-foreground",
        "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md",
        "prose-code:font-mono prose-code:font-normal",
        "prose-code:before:content-none prose-code:after:content-none",
        // Code block style
        "prose-pre:bg-muted/60 prose-pre:border prose-pre:border-border/40",
        "prose-pre:rounded-xl prose-pre:p-5 prose-pre:my-6",
        "prose-pre:overflow-x-auto prose-pre:text-[13px] prose-pre:leading-relaxed",
        // Image style
        "prose-img:rounded-xl prose-img:my-8",
        "prose-img:border prose-img:border-border/20",
        // Table style
        "prose-table:my-6 prose-table:border-collapse prose-table:w-full",
        "prose-table:text-sm",
        "prose-th:border prose-th:border-border/50 prose-th:bg-muted/40",
        "prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium",
        "prose-td:border prose-td:border-border/50 prose-td:px-3 prose-td:py-2",
        // Horizontal rule
        "prose-hr:my-10 prose-hr:border-border/40",
        // Strong, em
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-em:italic prose-em:text-foreground/85",
        className
      )}
    >
      {mdxContent}
    </article>
  );
}
