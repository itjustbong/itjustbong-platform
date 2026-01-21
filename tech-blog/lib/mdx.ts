import { compileMDX } from "next-mdx-remote/rsc";
import type { MDXComponents } from "mdx/types";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Category } from "@/types";

export interface MDXFrontmatter {
  title: string;
  description: string;
  category: Category;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt?: string;
  published?: boolean;
}

export async function compileMDXContent(
  source: string,
  components?: MDXComponents
) {
  const { content, frontmatter } = await compileMDX<MDXFrontmatter>({
    source,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, rehypeHighlight],
      },
    },
  });

  return { content, frontmatter };
}

export function extractHeadings(
  content: string
): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  const idCounts: Record<string, number> = {};

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    let id = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-");

    // 중복 id 처리 (rehype-slug와 동일한 방식)
    if (idCounts[id] !== undefined) {
      idCounts[id]++;
      id = `${id}-${idCounts[id]}`;
    } else {
      idCounts[id] = 0;
    }

    headings.push({ id, text, level });
  }

  return headings;
}
