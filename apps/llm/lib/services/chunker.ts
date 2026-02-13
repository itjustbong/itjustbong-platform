import type { ChunkMetadata, ChunkOptions, TextChunk } from "../types";

/** 기본 청킹 옵션 */
const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
};

/**
 * 텍스트를 문단 경계(\n\n)로 분할한다.
 * 빈 문단은 제거한다.
 */
function splitByParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 텍스트를 문장 경계로 분할한다.
 * 마침표(.), 느낌표(!), 물음표(?) 뒤의 공백을 기준으로 분할한다.
 * 빈 문장은 제거한다.
 */
function splitBySentences(text: string): string[] {
  // 문장 종결 부호 뒤에 공백 또는 줄바꿈이 오는 경우 분할
  const sentences = text.split(/(?<=[.!?。])\s+/);
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * 세그먼트 목록을 chunkSize 이하의 청크로 병합한다.
 * 각 세그먼트를 순서대로 현재 청크에 추가하되,
 * chunkSize를 초과하면 새 청크를 시작한다.
 *
 * chunkSize보다 큰 개별 세그먼트는 강제로 chunkSize 단위로 분할한다.
 */
function mergeSegmentsIntoChunks(
  segments: string[],
  chunkSize: number
): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    // 세그먼트 자체가 chunkSize보다 큰 경우 강제 분할
    if (segment.length > chunkSize) {
      // 현재 누적된 내용이 있으면 먼저 청크로 저장
      if (current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      // 긴 세그먼트를 chunkSize 단위로 분할
      let remaining = segment;
      while (remaining.length > chunkSize) {
        chunks.push(remaining.slice(0, chunkSize));
        remaining = remaining.slice(chunkSize);
      }
      if (remaining.length > 0) {
        current = remaining;
      }
      continue;
    }

    // 현재 청크에 세그먼트를 추가했을 때 chunkSize를 초과하는지 확인
    const separator = current.length > 0 ? " " : "";
    const candidate = current + separator + segment;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      // 현재 청크를 저장하고 새 청크 시작
      if (current.length > 0) {
        chunks.push(current.trim());
      }
      current = segment;
    }
  }

  // 마지막 남은 내용 저장
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * 청크 목록에 오버랩을 적용한다.
 * 이전 청크의 마지막 chunkOverlap 글자를 다음 청크의 앞에 추가한다.
 * 오버랩 적용 후에도 chunkSize를 초과하지 않도록 한다.
 */
function applyOverlap(
  chunks: string[],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  if (chunks.length <= 1 || chunkOverlap <= 0) {
    return chunks;
  }

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const overlapText = prevChunk.slice(-chunkOverlap);
    const combined = overlapText + chunks[i];

    // 오버랩 적용 후 chunkSize를 초과하면 잘라낸다
    if (combined.length > chunkSize) {
      result.push(combined.slice(0, chunkSize));
    } else {
      result.push(combined);
    }
  }

  return result;
}

/**
 * 텍스트를 의미 단위로 분할하여 TextChunk 배열을 반환한다.
 *
 * 분할 전략:
 * 1. 문단 경계(\n\n)로 먼저 분할
 * 2. 문단이 chunkSize를 초과하면 문장 경계로 추가 분할
 * 3. 문장도 chunkSize를 초과하면 강제로 chunkSize 단위로 분할
 * 4. 세그먼트들을 chunkSize 이하로 병합
 * 5. 인접 청크 간 오버랩 적용
 *
 * @param text - 분할할 텍스트
 * @param metadata - 각 청크에 포함할 메타데이터
 * @param options - 청킹 옵션 (chunkSize, chunkOverlap)
 * @returns TextChunk 배열
 */
function chunkText(
  text: string,
  metadata: ChunkMetadata,
  options?: Partial<ChunkOptions>
): TextChunk[] {
  const { chunkSize, chunkOverlap } = {
    ...DEFAULT_CHUNK_OPTIONS,
    ...options,
  };

  // 빈 텍스트 처리
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // 텍스트가 chunkSize 이하이면 단일 청크 반환
  if (trimmed.length <= chunkSize) {
    return [
      {
        text: trimmed,
        index: 0,
        metadata,
      },
    ];
  }

  // 1단계: 문단 경계로 분할
  const paragraphs = splitByParagraphs(trimmed);

  // 2단계: 큰 문단을 문장 경계로 추가 분할
  const segments: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= chunkSize) {
      segments.push(paragraph);
    } else {
      // 문장 경계로 분할
      const sentences = splitBySentences(paragraph);
      segments.push(...sentences);
    }
  }

  // 3단계: 세그먼트들을 chunkSize 이하로 병합
  const rawChunks = mergeSegmentsIntoChunks(segments, chunkSize);

  // 4단계: 오버랩 적용
  const chunksWithOverlap = applyOverlap(rawChunks, chunkSize, chunkOverlap);

  // 5단계: TextChunk 객체로 변환
  return chunksWithOverlap.map((chunkText, index) => ({
    text: chunkText,
    index,
    metadata,
  }));
}

export {
  chunkText,
  splitByParagraphs,
  splitBySentences,
  mergeSegmentsIntoChunks,
  applyOverlap,
  DEFAULT_CHUNK_OPTIONS,
};
