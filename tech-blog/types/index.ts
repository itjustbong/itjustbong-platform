// 카테고리는 content/posts 폴더 구조에서 동적으로 가져옴
export type Category = string;

export interface CategoryInfo {
  slug: string;
  label: string;
  count: number;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: Category;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
}

export interface Draft {
  id: string;
  title: string;
  description: string;
  content: string;
  category: Category;
  tags: string[];
  thumbnail?: string;
  savedAt: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt?: string;
  published?: boolean;
}
