/**
 * OG 이미지 빌드 스크립트
 * 빌드 시 모든 포스트의 썸네일 이미지를 public/og/ 폴더에 생성합니다.
 * 이미 존재하는 이미지는 스킵합니다.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import satori from "satori";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT_DIR, "content/posts");
const OUTPUT_DIR = path.join(ROOT_DIR, "public/og");

// 카테고리별 테마
const categoryThemes = {
  frontend: {
    bg1: "#667eea",
    bg2: "#764ba2",
    accent: "#c4b5fd",
    letter: "F",
  },
  backend: {
    bg1: "#0d9488",
    bg2: "#14b8a6",
    accent: "#99f6e4",
    letter: "B",
  },
  docker: {
    bg1: "#0284c7",
    bg2: "#0ea5e9",
    accent: "#7dd3fc",
    letter: "D",
  },
  blockchain: {
    bg1: "#7c3aed",
    bg2: "#a855f7",
    accent: "#d8b4fe",
    letter: "B",
  },
  ai: {
    bg1: "#ea580c",
    bg2: "#f97316",
    accent: "#fed7aa",
    letter: "A",
  },
};

const categoryLabels = {
  frontend: "FRONTEND",
  backend: "BACKEND",
  docker: "DOCKER",
  blockchain: "BLOCKCHAIN",
  ai: "AI",
};

const defaultTheme = {
  bg1: "#1e293b",
  bg2: "#475569",
  accent: "#cbd5e1",
  letter: "T",
};

function truncateTitle(title, maxLength = 24) {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
}

// 폰트 캐시
let fontCache = null;

async function loadFonts() {
  if (fontCache) return fontCache;

  console.log("📦 폰트 로딩 중...");

  // Pretendard 폰트 (한국어 지원) - GitHub raw 파일에서 직접 다운로드
  const fontUrl =
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf";

  const fontUrlBlack =
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Black.otf";

  try {
    const [boldFont, blackFont] = await Promise.all([
      fetch(fontUrl).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrlBlack).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
    ]);

    fontCache = [
      {
        name: "Pretendard",
        data: boldFont,
        weight: 700,
        style: "normal",
      },
      {
        name: "Pretendard",
        data: blackFont,
        weight: 900,
        style: "normal",
      },
    ];

    console.log("✅ 폰트 로딩 완료!");
    return fontCache;
  } catch (error) {
    console.error("폰트 로딩 실패:", error.message);
    throw error;
  }
}

// SVG 생성 함수
function generateSvgMarkup(title, category) {
  const theme = categoryThemes[category] || defaultTheme;
  const categoryLabel = categoryLabels[category] || category.toUpperCase();
  const truncatedTitle = truncateTitle(title, 24);

  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`,
        padding: "70px 80px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Pretendard",
      },
      children: [
        // 배경 워터마크
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: -40,
              left: -20,
              fontSize: 400,
              fontWeight: 900,
              color: "rgba(255, 255, 255, 0.08)",
              lineHeight: 1,
              letterSpacing: "-0.05em",
              fontFamily: "Pretendard",
            },
            children: theme.letter,
          },
        },
        // 장식 원형 1
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: -100,
              right: -100,
              width: 350,
              height: 350,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${theme.accent}33 0%, transparent 70%)`,
            },
          },
        },
        // 장식 원형 2
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: -80,
              right: 200,
              width: 250,
              height: 250,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${theme.accent}26 0%, transparent 70%)`,
            },
          },
        },
        // 콘텐츠 영역
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              flex: 1,
              width: "100%",
              position: "relative",
            },
            children: [
              // 카테고리
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 16,
                    color: theme.accent,
                    letterSpacing: "0.3em",
                    fontWeight: 700,
                    marginBottom: 16,
                    fontFamily: "Pretendard",
                  },
                  children: categoryLabel,
                },
              },
              // 제목
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 54,
                    fontWeight: 900,
                    color: "#ffffff",
                    lineHeight: 1.25,
                    letterSpacing: "-0.03em",
                    fontFamily: "Pretendard",
                  },
                  children: truncatedTitle,
                },
              },
            ],
          },
        },
        // 하단 액센트 라인
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "40%",
              height: 5,
              background: theme.accent,
              opacity: 0.8,
            },
          },
        },
      ],
    },
  };
}

async function getAllPosts() {
  const posts = [];

  try {
    const categories = await fs.readdir(POSTS_DIR, { withFileTypes: true });

    for (const category of categories) {
      if (!category.isDirectory()) continue;

      const categoryPath = path.join(POSTS_DIR, category.name);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.endsWith(".mdx")) continue;

        const filePath = path.join(categoryPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { data } = matter(content);

        posts.push({
          slug: file.replace(".mdx", ""),
          title: data.title,
          category: category.name,
          thumbnail: data.thumbnail,
        });
      }
    }
  } catch (error) {
    console.error("포스트 로드 실패:", error);
  }

  return posts;
}

async function generateImage(post, fonts) {
  const outputPath = path.join(OUTPUT_DIR, `${post.slug}.png`);

  // 커스텀 썸네일이 있으면 스킵
  if (post.thumbnail) {
    console.log(`⏭️  스킵: ${post.slug} (커스텀 썸네일 사용)`);
    return;
  }

  // 이미 이미지가 있으면 스킵
  try {
    await fs.access(outputPath);
    console.log(`⏭️  스킵: ${post.slug}.png (이미 존재)`);
    return;
  } catch {
    // 파일이 없으면 계속 진행
  }

  console.log(`🎨 생성 중: ${post.slug}.png`);

  try {
    // Satori로 SVG 생성
    const svg = await satori(generateSvgMarkup(post.title, post.category), {
      width: 1200,
      height: 630,
      fonts,
    });

    // Sharp로 PNG 변환
    await sharp(Buffer.from(svg)).png().toFile(outputPath);

    console.log(`✅ 완료: ${post.slug}.png`);
  } catch (error) {
    console.error(`❌ 실패: ${post.slug}.png -`, error.message);
  }
}

async function main() {
  console.log("🚀 OG 이미지 생성 시작...\n");

  // 출력 폴더 생성
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // 폰트 로드
  const fonts = await loadFonts();

  // 모든 포스트 가져오기
  const posts = await getAllPosts();
  console.log(`📝 총 ${posts.length}개 포스트 발견\n`);

  // 이미지 생성
  for (const post of posts) {
    await generateImage(post, fonts);
  }

  console.log("\n✨ OG 이미지 생성 완료!");
}

main().catch(console.error);
