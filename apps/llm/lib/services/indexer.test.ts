import { describe, it, expect, vi, beforeEach } from "vitest";
import { runIndexingPipeline, buildVectorPoints } from "./indexer";
import type { IndexerDependencies } from "./indexer";
import type {
  KnowledgeSource,
  CollectedContent,
  TextChunk,
  ChunkMetadata,
} from "../types";

// ============================================================
// 테스트 헬퍼
// ============================================================

/** 테스트용 모의 의존성을 생성한다 */
function createMockDeps(
  overrides?: Partial<IndexerDependencies>
): IndexerDependencies {
  return {
    vectorStore: {
      ensureCollection: vi.fn().mockResolvedValue(undefined),
      getContentHashByUrl: vi.fn().mockResolvedValue(null),
      deleteBySourceUrl: vi.fn().mockResolvedValue(undefined),
      upsertPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IndexerDependencies["vectorStore"],
    collector: vi.fn().mockResolvedValue({
      url: "https://example.com",
      title: "테스트 페이지",
      text: "테스트 본문 내용입니다.",
      contentHash: "abc123hash",
      collectedAt: new Date().toISOString(),
    } satisfies CollectedContent),
    chunker: vi.fn().mockReturnValue([
      {
        text: "테스트 본문 내용입니다.",
        index: 0,
        metadata: {
          sourceUrl: "https://example.com",
          sourceTitle: "테스트 페이지",
          category: "blog",
        },
      },
    ] satisfies TextChunk[]),
    embedder: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    hashGenerator: vi.fn().mockReturnValue("text-hash-123"),
    ...overrides,
  };
}

/** 테스트용 URL 소스를 생성한다 */
function createUrlSource(
  overrides?: Partial<KnowledgeSource>
): KnowledgeSource {
  return {
    url: "https://example.com",
    title: "테스트 페이지",
    category: "blog",
    type: "url",
    ...overrides,
  };
}

/** 테스트용 텍스트 소스를 생성한다 */
function createTextSource(
  overrides?: Partial<KnowledgeSource>
): KnowledgeSource {
  return {
    url: "text://manual-input-1",
    title: "직접 입력 지식",
    category: "manual",
    type: "text",
    content: "직접 입력한 텍스트 내용입니다.",
    ...overrides,
  };
}

// ============================================================
// runIndexingPipeline - URL 소스 처리
// ============================================================

describe("runIndexingPipeline - URL 소스", () => {
  it("새로운 URL 소스를 성공적으로 인덱싱한다", async () => {
    const deps = createMockDeps();
    const sources = [createUrlSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("success");
    expect(results[0].url).toBe("https://example.com");
    expect(results[0].chunksCount).toBe(1);
  });

  it("수집 → 해시 비교 → 청킹 → 임베딩 → 저장 순서로 처리한다", async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      collector: vi.fn().mockImplementation(async () => {
        callOrder.push("collect");
        return {
          url: "https://example.com",
          title: "테스트",
          text: "본문",
          contentHash: "new-hash",
          collectedAt: new Date().toISOString(),
        } satisfies CollectedContent;
      }),
      vectorStore: {
        ensureCollection: vi.fn().mockResolvedValue(undefined),
        getContentHashByUrl: vi.fn().mockImplementation(async () => {
          callOrder.push("hashCheck");
          return null;
        }),
        deleteBySourceUrl: vi.fn().mockImplementation(async () => {
          callOrder.push("delete");
        }),
        upsertPoints: vi.fn().mockImplementation(async () => {
          callOrder.push("upsert");
        }),
      } as unknown as IndexerDependencies["vectorStore"],
      chunker: vi.fn().mockImplementation(() => {
        callOrder.push("chunk");
        return [
          {
            text: "본문",
            index: 0,
            metadata: {
              sourceUrl: "https://example.com",
              sourceTitle: "테스트",
              category: "blog",
            },
          },
        ];
      }),
      embedder: vi.fn().mockImplementation(async () => {
        callOrder.push("embed");
        return [[0.1, 0.2]];
      }),
    });

    await runIndexingPipeline([createUrlSource()], deps);

    expect(callOrder).toEqual([
      "collect",
      "hashCheck",
      "delete",
      "chunk",
      "embed",
      "upsert",
    ]);
  });

  it("콘텐츠 해시가 동일하면 건너뛴다", async () => {
    const deps = createMockDeps({
      vectorStore: {
        ensureCollection: vi.fn().mockResolvedValue(undefined),
        getContentHashByUrl: vi
          .fn()
          .mockResolvedValue("abc123hash"),
        deleteBySourceUrl: vi.fn(),
        upsertPoints: vi.fn(),
      } as unknown as IndexerDependencies["vectorStore"],
    });
    const sources = [createUrlSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("skipped");
    expect(
      deps.vectorStore!.deleteBySourceUrl
    ).not.toHaveBeenCalled();
  });

  it("콘텐츠 해시가 다르면 기존 데이터를 삭제하고 업데이트한다", async () => {
    const deps = createMockDeps({
      vectorStore: {
        ensureCollection: vi.fn().mockResolvedValue(undefined),
        getContentHashByUrl: vi
          .fn()
          .mockResolvedValue("old-hash"),
        deleteBySourceUrl: vi.fn().mockResolvedValue(undefined),
        upsertPoints: vi.fn().mockResolvedValue(undefined),
      } as unknown as IndexerDependencies["vectorStore"],
    });
    const sources = [createUrlSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("success");
    expect(
      deps.vectorStore!.deleteBySourceUrl
    ).toHaveBeenCalledWith("https://example.com");
    expect(deps.vectorStore!.upsertPoints).toHaveBeenCalled();
  });

  it("수집 실패 시 failed 상태와 오류 메시지를 반환한다", async () => {
    const deps = createMockDeps({
      collector: vi
        .fn()
        .mockRejectedValue(
          new Error("URL에 접속할 수 없습니다: https://fail.com")
        ),
    });
    const sources = [
      createUrlSource({ url: "https://fail.com" }),
    ];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain(
      "URL에 접속할 수 없습니다"
    );
  });

  it("임베딩 실패 시 failed 상태를 반환한다", async () => {
    const deps = createMockDeps({
      embedder: vi
        .fn()
        .mockRejectedValue(
          new Error("임베딩 생성에 실패했습니다.")
        ),
    });
    const sources = [createUrlSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("임베딩 생성에 실패");
  });

  it("청킹 결과가 빈 배열이면 chunksCount 0으로 성공한다", async () => {
    const deps = createMockDeps({
      chunker: vi.fn().mockReturnValue([]),
    });
    const sources = [createUrlSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("success");
    expect(results[0].chunksCount).toBe(0);
    expect(deps.embedder).not.toHaveBeenCalled();
  });
});

// ============================================================
// runIndexingPipeline - 텍스트 소스 처리
// ============================================================

describe("runIndexingPipeline - 텍스트 소스", () => {
  it("텍스트 소스를 성공적으로 인덱싱한다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("success");
    expect(results[0].chunksCount).toBe(1);
  });

  it("텍스트 소스는 collector를 호출하지 않는다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource()];

    await runIndexingPipeline(sources, deps);

    expect(deps.collector).not.toHaveBeenCalled();
  });

  it("텍스트 소스의 해시를 hashGenerator로 생성한다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource()];

    await runIndexingPipeline(sources, deps);

    expect(deps.hashGenerator).toHaveBeenCalledWith(
      "직접 입력한 텍스트 내용입니다."
    );
  });

  it("텍스트 소스의 해시가 동일하면 건너뛴다", async () => {
    const deps = createMockDeps({
      vectorStore: {
        ensureCollection: vi.fn().mockResolvedValue(undefined),
        getContentHashByUrl: vi
          .fn()
          .mockResolvedValue("text-hash-123"),
        deleteBySourceUrl: vi.fn(),
        upsertPoints: vi.fn(),
      } as unknown as IndexerDependencies["vectorStore"],
    });
    const sources = [createTextSource()];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("skipped");
  });

  it("빈 텍스트 콘텐츠는 failed 상태를 반환한다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource({ content: "" })];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("비어있습니다");
  });

  it("공백만 있는 텍스트 콘텐츠는 failed 상태를 반환한다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource({ content: "   \n  " })];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("비어있습니다");
  });

  it("content가 undefined인 텍스트 소스는 failed 상태를 반환한다", async () => {
    const deps = createMockDeps();
    const sources = [createTextSource({ content: undefined })];

    const results = await runIndexingPipeline(sources, deps);

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("비어있습니다");
  });
});

// ============================================================
// runIndexingPipeline - 여러 소스 순차 처리
// ============================================================

describe("runIndexingPipeline - 순차 처리", () => {
  it("여러 소스를 순차적으로 처리하고 각각의 결과를 반환한다", async () => {
    const deps = createMockDeps();
    const sources = [
      createUrlSource({ url: "https://a.com", title: "A" }),
      createUrlSource({ url: "https://b.com", title: "B" }),
      createTextSource({
        url: "text://c",
        title: "C",
      }),
    ];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(3);
    expect(results[0].url).toBe("https://a.com");
    expect(results[1].url).toBe("https://b.com");
    expect(results[2].url).toBe("text://c");
  });

  it("하나의 소스가 실패해도 나머지 소스를 계속 처리한다", async () => {
    const collectorFn = vi
      .fn()
      .mockResolvedValueOnce({
        url: "https://a.com",
        title: "A",
        text: "본문 A",
        contentHash: "hash-a",
        collectedAt: new Date().toISOString(),
      } satisfies CollectedContent)
      .mockRejectedValueOnce(new Error("수집 실패"))
      .mockResolvedValueOnce({
        url: "https://c.com",
        title: "C",
        text: "본문 C",
        contentHash: "hash-c",
        collectedAt: new Date().toISOString(),
      } satisfies CollectedContent);

    const deps = createMockDeps({ collector: collectorFn });
    const sources = [
      createUrlSource({ url: "https://a.com" }),
      createUrlSource({ url: "https://b.com" }),
      createUrlSource({ url: "https://c.com" }),
    ];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe("success");
    expect(results[1].status).toBe("failed");
    expect(results[2].status).toBe("success");
  });

  it("빈 소스 목록은 빈 결과 배열을 반환한다", async () => {
    const deps = createMockDeps();
    const results = await runIndexingPipeline([], deps);

    expect(results).toEqual([]);
  });

  it("결과 수는 입력 소스 수와 동일하다", async () => {
    const deps = createMockDeps();
    const sources = [
      createUrlSource({ url: "https://1.com" }),
      createUrlSource({ url: "https://2.com" }),
      createTextSource({ url: "text://3" }),
      createUrlSource({ url: "https://4.com" }),
    ];

    const results = await runIndexingPipeline(sources, deps);

    expect(results).toHaveLength(sources.length);
  });
});

// ============================================================
// buildVectorPoints
// ============================================================

describe("buildVectorPoints", () => {
  it("TextChunk와 임베딩을 VectorPoint로 변환한다", () => {
    const chunks: TextChunk[] = [
      {
        text: "첫 번째 청크",
        index: 0,
        metadata: {
          sourceUrl: "https://example.com",
          sourceTitle: "테스트",
          category: "blog",
        },
      },
      {
        text: "두 번째 청크",
        index: 1,
        metadata: {
          sourceUrl: "https://example.com",
          sourceTitle: "테스트",
          category: "blog",
        },
      },
    ];
    const embeddings = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ];

    const points = buildVectorPoints(
      chunks,
      embeddings,
      "content-hash",
      "https://example.com"
    );

    expect(points).toHaveLength(2);
    expect(points[0].vector.dense).toEqual([0.1, 0.2, 0.3]);
    expect(points[0].payload.text).toBe("첫 번째 청크");
    expect(points[0].payload.sourceUrl).toBe(
      "https://example.com"
    );
    expect(points[0].payload.sourceTitle).toBe("테스트");
    expect(points[0].payload.category).toBe("blog");
    expect(points[0].payload.chunkIndex).toBe(0);
    expect(points[0].payload.contentHash).toBe("content-hash");
    expect(points[1].payload.chunkIndex).toBe(1);
  });

  it("각 포인트에 고유한 UUID를 생성한다", () => {
    const chunks: TextChunk[] = [
      {
        text: "청크 1",
        index: 0,
        metadata: {
          sourceUrl: "https://example.com",
          sourceTitle: "테스트",
          category: "blog",
        },
      },
      {
        text: "청크 2",
        index: 1,
        metadata: {
          sourceUrl: "https://example.com",
          sourceTitle: "테스트",
          category: "blog",
        },
      },
    ];

    const points = buildVectorPoints(
      chunks,
      [[0.1], [0.2]],
      "hash",
      "https://example.com"
    );

    expect(points[0].id).not.toBe(points[1].id);
    // UUID v4 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(points[0].id).toMatch(uuidRegex);
    expect(points[1].id).toMatch(uuidRegex);
  });
});
