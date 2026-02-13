import { describe, it, expect } from "vitest";
import {
  chunkText,
  splitByParagraphs,
  splitBySentences,
  mergeSegmentsIntoChunks,
  applyOverlap,
  DEFAULT_CHUNK_OPTIONS,
} from "./chunker";
import type { ChunkMetadata } from "../types";

const testMetadata: ChunkMetadata = {
  sourceUrl: "https://example.com/post",
  sourceTitle: "테스트 포스트",
  category: "blog",
};

// ============================================================
// splitByParagraphs
// ============================================================

describe("splitByParagraphs", () => {
  it("문단 경계(\\n\\n)로 텍스트를 분할한다", () => {
    const text = "첫 번째 문단\n\n두 번째 문단\n\n세 번째 문단";
    const result = splitByParagraphs(text);
    expect(result).toEqual(["첫 번째 문단", "두 번째 문단", "세 번째 문단"]);
  });

  it("빈 문단을 제거한다", () => {
    const text = "문단 A\n\n\n\n문단 B";
    const result = splitByParagraphs(text);
    expect(result).toEqual(["문단 A", "문단 B"]);
  });

  it("단일 문단은 하나의 요소로 반환한다", () => {
    const text = "단일 문단입니다.";
    const result = splitByParagraphs(text);
    expect(result).toEqual(["단일 문단입니다."]);
  });

  it("빈 텍스트는 빈 배열을 반환한다", () => {
    expect(splitByParagraphs("")).toEqual([]);
    expect(splitByParagraphs("   ")).toEqual([]);
  });

  it("각 문단의 앞뒤 공백을 제거한다", () => {
    const text = "  문단 A  \n\n  문단 B  ";
    const result = splitByParagraphs(text);
    expect(result).toEqual(["문단 A", "문단 B"]);
  });
});

// ============================================================
// splitBySentences
// ============================================================

describe("splitBySentences", () => {
  it("마침표 뒤 공백으로 문장을 분할한다", () => {
    const text = "첫 번째 문장. 두 번째 문장. 세 번째 문장.";
    const result = splitBySentences(text);
    expect(result).toEqual([
      "첫 번째 문장.",
      "두 번째 문장.",
      "세 번째 문장.",
    ]);
  });

  it("느낌표와 물음표로도 분할한다", () => {
    const text = "안녕하세요! 반갑습니다. 잘 지내셨나요?";
    const result = splitBySentences(text);
    expect(result).toEqual(["안녕하세요!", "반갑습니다.", "잘 지내셨나요?"]);
  });

  it("문장 종결 부호 없는 텍스트는 하나의 요소로 반환한다", () => {
    const text = "종결 부호가 없는 텍스트";
    const result = splitBySentences(text);
    expect(result).toEqual(["종결 부호가 없는 텍스트"]);
  });

  it("빈 문장을 제거한다", () => {
    const text = "문장 A.  문장 B.";
    const result = splitBySentences(text);
    expect(result).toEqual(["문장 A.", "문장 B."]);
  });
});

// ============================================================
// mergeSegmentsIntoChunks
// ============================================================

describe("mergeSegmentsIntoChunks", () => {
  it("세그먼트들을 chunkSize 이하로 병합한다", () => {
    const segments = ["가나다", "라마바", "사아자"];
    const result = mergeSegmentsIntoChunks(segments, 10);
    // "가나다 라마바" = 7자, "사아자" = 3자
    expect(result).toEqual(["가나다 라마바", "사아자"]);
  });

  it("chunkSize보다 큰 세그먼트를 강제 분할한다", () => {
    const longSegment = "가".repeat(15);
    const result = mergeSegmentsIntoChunks([longSegment], 10);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(10);
    expect(result[1].length).toBe(5);
  });

  it("빈 세그먼트 배열은 빈 배열을 반환한다", () => {
    expect(mergeSegmentsIntoChunks([], 100)).toEqual([]);
  });

  it("단일 세그먼트가 chunkSize 이하이면 그대로 반환한다", () => {
    const result = mergeSegmentsIntoChunks(["짧은 텍스트"], 100);
    expect(result).toEqual(["짧은 텍스트"]);
  });
});

// ============================================================
// applyOverlap
// ============================================================

describe("applyOverlap", () => {
  it("인접 청크 간 오버랩을 적용한다", () => {
    const chunks = ["AAABBB", "CCCDDD"];
    const result = applyOverlap(chunks, 20, 3);
    expect(result[0]).toBe("AAABBB");
    expect(result[1]).toBe("BBBCCCDDD");
  });

  it("단일 청크에는 오버랩을 적용하지 않는다", () => {
    const chunks = ["단일 청크"];
    const result = applyOverlap(chunks, 100, 10);
    expect(result).toEqual(["단일 청크"]);
  });

  it("오버랩이 0이면 원본 청크를 그대로 반환한다", () => {
    const chunks = ["청크A", "청크B"];
    const result = applyOverlap(chunks, 100, 0);
    expect(result).toEqual(["청크A", "청크B"]);
  });

  it("오버랩 적용 후 chunkSize를 초과하면 잘라낸다", () => {
    const chunks = ["AAABBB", "CCCDDD"];
    const result = applyOverlap(chunks, 8, 3);
    // "BBB" + "CCCDDD" = "BBBCCCDDD" (9자) > 8 → 잘라냄
    expect(result[1].length).toBeLessThanOrEqual(8);
  });
});

// ============================================================
// chunkText
// ============================================================

describe("chunkText", () => {
  it("빈 텍스트는 빈 배열을 반환한다", () => {
    expect(chunkText("", testMetadata)).toEqual([]);
    expect(chunkText("   ", testMetadata)).toEqual([]);
  });

  it("chunkSize 이하의 텍스트는 단일 청크를 반환한다", () => {
    const text = "짧은 텍스트입니다.";
    const result = chunkText(text, testMetadata, { chunkSize: 500 });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(text);
    expect(result[0].index).toBe(0);
  });

  it("각 청크에 올바른 메타데이터를 포함한다", () => {
    const text = "짧은 텍스트";
    const result = chunkText(text, testMetadata);
    expect(result[0].metadata).toEqual(testMetadata);
    expect(result[0].metadata.sourceUrl).toBe("https://example.com/post");
    expect(result[0].metadata.sourceTitle).toBe("테스트 포스트");
    expect(result[0].metadata.category).toBe("blog");
  });

  it("청크 인덱스가 0부터 순차적으로 증가한다", () => {
    const text = "가".repeat(200) + "\n\n" + "나".repeat(200) + "\n\n" + "다".repeat(200);
    const result = chunkText(text, testMetadata, {
      chunkSize: 250,
      chunkOverlap: 0,
    });
    expect(result.length).toBeGreaterThan(1);
    result.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("문단 경계를 우선하여 분할한다", () => {
    const paragraph1 = "첫 번째 문단의 내용입니다.";
    const paragraph2 = "두 번째 문단의 내용입니다.";
    const text = paragraph1 + "\n\n" + paragraph2;
    const result = chunkText(text, testMetadata, {
      chunkSize: 30,
      chunkOverlap: 0,
    });
    // 각 문단이 chunkSize 이하이므로 별도 청크로 분할
    expect(result.length).toBe(2);
    expect(result[0].text).toBe(paragraph1);
    expect(result[1].text).toBe(paragraph2);
  });

  it("큰 문단은 문장 경계로 추가 분할한다", () => {
    const text =
      "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.";
    const result = chunkText(text, testMetadata, {
      chunkSize: 30,
      chunkOverlap: 0,
    });
    expect(result.length).toBeGreaterThan(1);
    // 각 청크가 chunkSize를 초과하지 않아야 한다
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(30);
    });
  });

  it("각 청크의 길이가 chunkSize를 초과하지 않는다", () => {
    const text = "가나다라마바사. ".repeat(100);
    const chunkSize = 50;
    const result = chunkText(text, testMetadata, {
      chunkSize,
      chunkOverlap: 10,
    });
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(chunkSize);
    });
  });

  it("기본 옵션(chunkSize=1000, chunkOverlap=200)을 사용한다", () => {
    const text = "가".repeat(2000);
    const result = chunkText(text, testMetadata);
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(1000);
    });
  });

  it("인접 청크 간 오버랩이 존재한다", () => {
    // 오버랩을 확인하기 위해 충분히 긴 텍스트 사용
    const text = "가".repeat(300) + "\n\n" + "나".repeat(300);
    const chunkOverlap = 50;
    const result = chunkText(text, testMetadata, {
      chunkSize: 200,
      chunkOverlap,
    });

    // 2번째 청크부터 이전 청크의 끝부분과 겹치는 부분이 있어야 한다
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        const prevEnd = result[i - 1].text.slice(-chunkOverlap);
        expect(result[i].text.startsWith(prevEnd)).toBe(true);
      }
    }
  });

  it("문장 경계 없는 매우 긴 텍스트를 강제 분할한다", () => {
    const text = "가".repeat(1500); // 경계 없는 긴 텍스트
    const chunkSize = 500;
    const result = chunkText(text, testMetadata, {
      chunkSize,
      chunkOverlap: 0,
    });
    expect(result.length).toBeGreaterThan(1);
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(chunkSize);
    });
  });

  it("옵션을 부분적으로 전달하면 나머지는 기본값을 사용한다", () => {
    const text = "가".repeat(1000);
    const result = chunkText(text, testMetadata, { chunkSize: 200 });
    // chunkOverlap은 기본값 200이 적용되어야 한다
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(200);
    });
  });

  it("모든 청크에 sourceUrl, sourceTitle, category 메타데이터가 포함된다", () => {
    const text = "가".repeat(200) + "\n\n" + "나".repeat(200) + "\n\n" + "다".repeat(200);
    const result = chunkText(text, testMetadata, {
      chunkSize: 250,
      chunkOverlap: 0,
    });
    result.forEach((chunk) => {
      expect(chunk.metadata.sourceUrl).toBe("https://example.com/post");
      expect(chunk.metadata.sourceTitle).toBe("테스트 포스트");
      expect(chunk.metadata.category).toBe("blog");
    });
  });
});

// ============================================================
// DEFAULT_CHUNK_OPTIONS
// ============================================================

describe("DEFAULT_CHUNK_OPTIONS", () => {
  it("기본 chunkSize는 1000이다", () => {
    expect(DEFAULT_CHUNK_OPTIONS.chunkSize).toBe(1000);
  });

  it("기본 chunkOverlap은 200이다", () => {
    expect(DEFAULT_CHUNK_OPTIONS.chunkOverlap).toBe(200);
  });
});
