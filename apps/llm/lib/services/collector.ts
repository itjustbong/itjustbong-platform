import { createHash } from "crypto";
import type { CollectedContent } from "../types";

/**
 * HTML에서 불필요한 요소(script, style, nav, footer, header, noscript)를
 * 제거한다. 중첩된 태그도 처리한다.
 */
function removeUnwantedElements(html: string): string {
  const tagsToRemove = [
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "noscript",
    "svg",
    "iframe",
  ];
  let result = html;
  for (const tag of tagsToRemove) {
    const regex = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`,
      "gi"
    );
    result = result.replace(regex, "");
  }
  return result;
}

/**
 * HTML 문자열에서 <title> 태그의 내용을 추출한다.
 * 찾지 못하면 null을 반환한다.
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

/**
 * HTML 문자열에서 모든 태그를 제거하고 본문 텍스트만 반환한다.
 * - 불필요한 요소(script, style, nav 등)를 먼저 제거
 * - 모든 HTML 태그를 제거
 * - HTML 엔티티를 디코딩
 * - 연속된 공백/줄바꿈을 정리
 */
function htmlToText(html: string): string {
  let text = removeUnwantedElements(html);

  // <br>, <p>, <div>, <li>, <h1~h6> 등 블록 요소 앞에 줄바꿈 추가
  text = text.replace(
    /<\/?(?:br|p|div|li|h[1-6]|tr|blockquote|section|article|aside|main)[^>]*>/gi,
    "\n"
  );

  // 모든 HTML 태그 제거
  text = text.replace(/<[^>]*>/g, "");

  // HTML 엔티티 디코딩
  text = decodeHtmlEntities(text);

  // 연속된 공백을 하나로 축소 (줄바꿈은 유지)
  text = text.replace(/[^\S\n]+/g, " ");

  // 연속된 줄바꿈을 최대 2개로 축소
  text = text.replace(/\n{3,}/g, "\n\n");

  // 각 줄의 앞뒤 공백 제거
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return text.trim();
}

/**
 * 기본적인 HTML 엔티티를 디코딩한다.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&mdash;": "—",
    "&ndash;": "–",
    "&laquo;": "«",
    "&raquo;": "»",
    "&hellip;": "…",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char);
  }

  // 숫자 엔티티 디코딩 (&#123; 또는 &#x1A; 형식)
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}

/**
 * 텍스트의 SHA-256 해시를 생성한다.
 */
function generateContentHash(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * URL에서 콘텐츠를 수집한다.
 *
 * - fetch API로 HTML을 가져온다
 * - HTML에서 불필요한 태그를 제거하고 본문 텍스트를 추출한다
 * - SHA-256 콘텐츠 해시를 생성한다
 * - 메타데이터(URL, 제목, 수집 시각)를 포함한다
 *
 * @param url - 수집할 웹 페이지 URL
 * @returns 수집된 콘텐츠 객체
 * @throws URL에 접속할 수 없는 경우 오류를 발생시킨다
 */
async function collectFromUrl(url: string): Promise<CollectedContent> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KnowledgeCollector/1.0)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `URL에 접속할 수 없습니다: ${url} (${message})`
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}: ${url}`
    );
  }

  const html = await response.text();
  const title = extractTitle(html) ?? url;
  const text = htmlToText(html);
  const contentHash = generateContentHash(text);
  const collectedAt = new Date().toISOString();

  return {
    url,
    title,
    text,
    contentHash,
    collectedAt,
  };
}

export {
  collectFromUrl,
  htmlToText,
  extractTitle,
  removeUnwantedElements,
  generateContentHash,
  decodeHtmlEntities,
};
