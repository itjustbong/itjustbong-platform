// 카테고리 라벨 매핑 (클라이언트/서버 공용)
export const CATEGORY_LABEL_MAP: Record<string, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  docker: "도커",
  blockchain: "블록체인",
  ai: "AI",
  devops: "DevOps",
  database: "데이터베이스",
  mobile: "모바일",
  security: "보안",
  cloud: "클라우드",
};

/**
 * 카테고리 slug를 라벨로 변환
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL_MAP[category.toLowerCase()] || category;
}
