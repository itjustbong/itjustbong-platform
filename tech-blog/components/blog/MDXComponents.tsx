import type { MDXComponents as MDXComponentsType } from "mdx/types";
import { Mermaid } from "./Mermaid";
import { Toc } from "./Toc";

// Helper function to check if code is a mermaid diagram
function isMermaidDiagram(code: string): boolean {
  const trimmed = code.trim();
  const mermaidKeywords = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "gitGraph",
    "mindmap",
    "timeline",
    "journey",
    "quadrantChart",
    "xychart",
    "sankey",
    "block",
    "subgraph",
  ];

  return mermaidKeywords.some(
    (keyword) =>
      trimmed.startsWith(keyword) ||
      trimmed.startsWith(keyword.toLowerCase()) ||
      trimmed.startsWith(keyword.toUpperCase())
  );
}

// Custom Pre component to handle mermaid code blocks
function Pre({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  // Check if this is a mermaid code block
  const childElement = children as React.ReactElement<{
    className?: string;
    children?: string;
  }>;

  const className = childElement?.props?.className || "";
  const code = childElement?.props?.children;

  // Check if it's marked as mermaid language
  if (className.includes("language-mermaid")) {
    if (typeof code === "string") {
      return <Mermaid chart={code} />;
    }
  }

  // Fallback: check if content looks like mermaid diagram
  // (for cases where language isn't explicitly set)
  if (typeof code === "string" && !className.includes("hljs") && isMermaidDiagram(code)) {
    return <Mermaid chart={code} />;
  }

  return <pre {...props}>{children}</pre>;
}

// Custom Code component to help identify mermaid blocks
function Code({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"code">) {
  // If it's a mermaid code block, just return the code element
  // The parent Pre component will handle the mermaid rendering
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

// Custom Link component for better visibility
function Link({
  href,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"a">) {
  return (
    <a
      href={href}
      className="text-primary font-medium underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
      {...props}
    >
      {children}
    </a>
  );
}

// Custom Table components for better styling
function Table({ children, ...props }: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table
        className="w-full border-collapse text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

function Thead({ children, ...props }: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  );
}

function Th({ children, ...props }: React.ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className="border-b border-border px-4 py-3 text-left font-semibold text-foreground"
      {...props}
    >
      {children}
    </th>
  );
}

function Td({ children, ...props }: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className="border-b border-border px-4 py-3 text-foreground/80"
      {...props}
    >
      {children}
    </td>
  );
}

function Tr({ children, ...props }: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <tr className="transition-colors hover:bg-muted/30" {...props}>
      {children}
    </tr>
  );
}

export const mdxComponents: MDXComponentsType = {
  pre: Pre,
  code: Code,
  a: Link,
  table: Table,
  thead: Thead,
  th: Th,
  td: Td,
  tr: Tr,
  Toc,
};
