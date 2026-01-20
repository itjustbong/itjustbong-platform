import type { PostMeta, Category } from "@/types";
import { getAllPosts, getCategorySlugs } from "./posts";

export interface SearchOptions {
  query?: string;
  category?: Category | null;
}

export async function searchPosts(options: SearchOptions): Promise<PostMeta[]> {
  const { query, category } = options;
  let posts = await getAllPosts();

  if (category) {
    posts = posts.filter((post) => post.category === category);
  }

  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    posts = posts.filter((post) => {
      const titleMatch = post.title.toLowerCase().includes(searchTerm);
      const descriptionMatch = post.description
        .toLowerCase()
        .includes(searchTerm);
      const tagsMatch = post.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm)
      );

      return titleMatch || descriptionMatch || tagsMatch;
    });
  }

  return posts;
}

export async function searchPostsWithContent(
  query: string
): Promise<PostMeta[]> {
  if (!query || !query.trim()) {
    return getAllPosts();
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  const matter = (await import("gray-matter")).default;

  const POSTS_DIR = path.join(process.cwd(), "content/posts");
  const searchTerm = query.toLowerCase().trim();

  try {
    const categories = await getCategorySlugs();
    const matchedPosts: PostMeta[] = [];

    for (const category of categories) {
      const categoryPath = path.join(POSTS_DIR, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.endsWith(".mdx")) continue;

        const filePath = path.join(categoryPath, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(fileContent);

        if (data.published === false) continue;

        const titleMatch = data.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = data.description
          ?.toLowerCase()
          .includes(searchTerm);
        const contentMatch = content.toLowerCase().includes(searchTerm);
        const tagsMatch = data.tags?.some((tag: string) =>
          tag.toLowerCase().includes(searchTerm)
        );

        if (titleMatch || descriptionMatch || contentMatch || tagsMatch) {
          matchedPosts.push({
            slug: file.replace(".mdx", ""),
            title: data.title,
            description: data.description,
            category,
            tags: data.tags || [],
            thumbnail: data.thumbnail,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            published: data.published,
          });
        }
      }
    }

    return matchedPosts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}
