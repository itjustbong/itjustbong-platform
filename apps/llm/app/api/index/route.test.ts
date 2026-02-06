import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";
import { SESSION_COOKIE_NAME } from "../admin/auth/route";

// ============================================================
// 모킹
// ============================================================

vi.mock("../admin/auth/route", async () => {
  const actual = await vi.importActual("../admin/auth/route");
  return {
    ...actual,
    SESSION_COOKIE_NAME: "admin_session",
    isValidSession: vi.fn(
      (token: string) => token === "valid-session-token"
    ),
  };
});

const mockRunIndexingPipeline = vi.fn();

vi.mock("../../../lib/services/indexer", () => ({
  runIndexingPipeline: (...args: unknown[]) =>
    mockRunIndexingPipeline(...args),
}));

const mockEnsureSourcesCollection = vi
  .fn()
  .mockResolvedValue(undefined);
const mockGetAllSources = vi.fn().mockResolvedValue([
  {
    id: "id-1",
    url: "https://blog.example.com/post-1",
    title: "테스트 포스트 1",
    category: "blog",
    type: "url" as const,
    indexingStatus: "not_indexed" as const,
  },
  {
    id: "id-2",
    url: "https://blog.example.com/post-2",
    title: "테스트 포스트 2",
    category: "blog",
    type: "url" as const,
    indexingStatus: "indexed" as const,
  },
]);

vi.mock("../../../lib/services/vector-store", () => {
  return {
    VectorStore: class MockVectorStore {
      ensureSourcesCollection = mockEnsureSourcesCollection;
      getAllSources = mockGetAllSources;
    },
  };
});

// ============================================================
// 헬퍼 함수
// ============================================================

function createPostRequest(
  authenticated: boolean = true,
  body?: Record<string, unknown>
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authenticated) {
    headers.Cookie =
      `${SESSION_COOKIE_NAME}=valid-session-token`;
  }
  return new NextRequest(
    "http://localhost:3000/api/index",
    {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }
  );
}

beforeEach(() => {
  mockRunIndexingPipeline.mockReset();
  mockEnsureSourcesCollection
    .mockReset()
    .mockResolvedValue(undefined);
  mockGetAllSources.mockReset().mockResolvedValue([
    {
      id: "id-1",
      url: "https://blog.example.com/post-1",
      title: "테스트 포스트 1",
      category: "blog",
      type: "url",
      indexingStatus: "not_indexed",
    },
    {
      id: "id-2",
      url: "https://blog.example.com/post-2",
      title: "테스트 포스트 2",
      category: "blog",
      type: "url",
      indexingStatus: "indexed",
    },
  ]);
});

// ============================================================
// POST /api/index - 인증
// ============================================================

describe("POST /api/index - 인증", () => {
  it("인증되지 않은 요청에 401 응답을 반환한다", async () => {
    const request = createPostRequest(false);
    const response = await POST(request);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다.");
  });

  it("유효하지 않은 세션 토큰으로 401 응답을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/index",
      {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=invalid-token`,
        },
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});

// ============================================================
// POST /api/index - 전체 인덱싱
// ============================================================

describe("POST /api/index - 전체 인덱싱", () => {
  it("Qdrant에서 소스를 읽어 인덱싱 파이프라인을 실행한다", async () => {
    mockRunIndexingPipeline.mockResolvedValue([
      { url: "https://blog.example.com/post-1", status: "success", chunksCount: 5 },
      { url: "https://blog.example.com/post-2", status: "skipped" },
    ]);

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.results).toHaveLength(2);
    expect(mockRunIndexingPipeline).toHaveBeenCalledTimes(1);

    const passedSources = mockRunIndexingPipeline.mock.calls[0][0];
    expect(passedSources).toHaveLength(2);
  });

  it("소스가 없는 경우 빈 결과를 반환한다", async () => {
    mockGetAllSources.mockResolvedValue([]);
    mockRunIndexingPipeline.mockResolvedValue([]);

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.results).toEqual([]);
  });
});

// ============================================================
// POST /api/index - 개별 인덱싱
// ============================================================

describe("POST /api/index - 개별 인덱싱", () => {
  it("특정 URL만 인덱싱한다", async () => {
    mockRunIndexingPipeline.mockResolvedValue([
      { url: "https://blog.example.com/post-1", status: "success", chunksCount: 3 },
    ]);

    const request = createPostRequest(true, {
      url: "https://blog.example.com/post-1",
      force: true,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const passedSources = mockRunIndexingPipeline.mock.calls[0][0];
    expect(passedSources).toHaveLength(1);
    expect(passedSources[0].url).toBe(
      "https://blog.example.com/post-1"
    );
  });

  it("존재하지 않는 URL 인덱싱 시 400 응답을 반환한다", async () => {
    const request = createPostRequest(true, {
      url: "https://nonexistent.com",
      force: true,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("찾을 수 없습니다");
  });
});

// ============================================================
// POST /api/index - 서버 오류
// ============================================================

describe("POST /api/index - 서버 오류", () => {
  it("인덱싱 파이프라인 오류 시 500 응답을 반환한다", async () => {
    mockRunIndexingPipeline.mockRejectedValue(
      new Error("파이프라인 실행 실패")
    );

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("서버 오류가 발생했습니다.");
  });
});
