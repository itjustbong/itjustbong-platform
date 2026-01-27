/**
 * 공용 타입 정의
 */

export type Category =
  | "frontend"
  | "backend"
  | "docker"
  | "blockchain"
  | "ai"
  | "architecture";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
}

export interface Post extends PostMeta {
  content: string;
  updatedAt: string;
  published: boolean;
}
