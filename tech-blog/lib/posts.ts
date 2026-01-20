import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Post, PostMeta, Category, Draft, CategoryInfo } from "@/types";
import { getCategoryLabel } from "./categories";

export { getCategoryLabel } from "./categories";

const POSTS_DIR = path.join(process.cwd(), "content/posts");
const DRAFTS_DIR = path.join(process.cwd(), "content/drafts");

/**
 * content/posts 폴더에서 모든 카테고리 폴더를 가져옴
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  try {
    const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    const categories: CategoryInfo[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryPath = path.join(POSTS_DIR, entry.name);
        const files = await fs.readdir(categoryPath);
        const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

        categories.push({
          slug: entry.name,
          label: getCategoryLabel(entry.name),
          count: mdxFiles.length,
        });
      }
    }

    return categories.sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

/**
 * 카테고리 slug 목록만 가져옴
 */
export async function getCategorySlugs(): Promise<string[]> {
  const categories = await getAllCategories();
  return categories.map((c) => c.slug);
}

/**
 * 모든 포스트 가져오기 (모든 카테고리 폴더에서)
 */
export async function getAllPosts(): Promise<PostMeta[]> {
  try {
    const categories = await getAllCategories();
    const allPosts: PostMeta[] = [];

    for (const category of categories) {
      const categoryPath = path.join(POSTS_DIR, category.slug);
      const files = await fs.readdir(categoryPath);

      const posts = await Promise.all(
        files
          .filter((file) => file.endsWith(".mdx"))
          .map(async (file) => {
            const filePath = path.join(categoryPath, file);
            const content = await fs.readFile(filePath, "utf-8");
            const { data } = matter(content);

            return {
              slug: file.replace(".mdx", ""),
              title: data.title,
              description: data.description,
              category: category.slug,
              tags: data.tags || [],
              thumbnail: data.thumbnail,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              published: data.published,
            } as PostMeta;
          })
      );

      allPosts.push(...posts);
    }

    return allPosts
      .filter((post) => post.published !== false)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

/**
 * slug로 포스트 가져오기 (모든 카테고리에서 검색)
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const categories = await getCategorySlugs();

    for (const category of categories) {
      const filePath = path.join(POSTS_DIR, category, `${slug}.mdx`);

      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(fileContent);

        return {
          slug,
          title: data.title,
          description: data.description,
          content,
          category,
          tags: data.tags || [],
          thumbnail: data.thumbnail,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || data.createdAt,
          published: data.published ?? true,
        };
      } catch {
        // 이 카테고리에 없으면 다음 카테고리 검색
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 카테고리별 포스트 가져오기
 */
export async function getPostsByCategory(
  category: Category
): Promise<PostMeta[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) => post.category === category);
}

/**
 * 포스트 썸네일 URL 가져오기
 */
export function getPostThumbnail(post: PostMeta): string {
  if (post.thumbnail) {
    return post.thumbnail;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${siteUrl}/posts/${post.slug}/opengraph-image`;
}

/**
 * 모든 slug 가져오기
 */
export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((post) => post.slug);
}

/**
 * 포스트 생성 (카테고리 폴더에 저장)
 */
export async function createPost(
  slug: string,
  postData: Omit<Post, "slug">
): Promise<void> {
  const categoryDir = path.join(POSTS_DIR, postData.category);

  // 카테고리 폴더가 없으면 생성
  await fs.mkdir(categoryDir, { recursive: true });

  const frontmatter = {
    title: postData.title,
    description: postData.description,
    tags: postData.tags,
    thumbnail: postData.thumbnail,
    createdAt: postData.createdAt,
    updatedAt: postData.updatedAt,
    published: postData.published,
  };

  const fileContent = matter.stringify(postData.content, frontmatter);
  const filePath = path.join(categoryDir, `${slug}.mdx`);

  await fs.writeFile(filePath, fileContent, "utf-8");
}

/**
 * 포스트 업데이트
 */
export async function updatePost(
  slug: string,
  postData: Partial<Omit<Post, "slug">>
): Promise<void> {
  const existingPost = await getPostBySlug(slug);
  if (!existingPost) {
    throw new Error(`Post not found: ${slug}`);
  }

  const updatedPost = {
    ...existingPost,
    ...postData,
    updatedAt: new Date().toISOString().split("T")[0],
  };

  // 카테고리가 변경되었으면 기존 파일 삭제
  if (postData.category && postData.category !== existingPost.category) {
    const oldFilePath = path.join(
      POSTS_DIR,
      existingPost.category,
      `${slug}.mdx`
    );
    try {
      await fs.unlink(oldFilePath);
    } catch {
      // 파일이 없으면 무시
    }
  }

  await createPost(slug, updatedPost);
}

/**
 * 포스트 삭제
 */
export async function deletePost(slug: string): Promise<void> {
  const post = await getPostBySlug(slug);
  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }

  const filePath = path.join(POSTS_DIR, post.category, `${slug}.mdx`);
  await fs.unlink(filePath);
}

// Draft 관련 함수들
export async function getAllDrafts(): Promise<Draft[]> {
  try {
    await fs.mkdir(DRAFTS_DIR, { recursive: true });
    const files = await fs.readdir(DRAFTS_DIR);
    const drafts = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const filePath = path.join(DRAFTS_DIR, file);
          const content = await fs.readFile(filePath, "utf-8");
          return JSON.parse(content) as Draft;
        })
    );

    return drafts.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getDraftById(id: string): Promise<Draft | null> {
  const filePath = path.join(DRAFTS_DIR, `${id}.json`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as Draft;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: Draft): Promise<void> {
  await fs.mkdir(DRAFTS_DIR, { recursive: true });
  const filePath = path.join(DRAFTS_DIR, `${draft.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(draft, null, 2), "utf-8");
}

export async function deleteDraft(id: string): Promise<void> {
  const filePath = path.join(DRAFTS_DIR, `${id}.json`);
  await fs.unlink(filePath);
}
