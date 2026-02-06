import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import { NextRequest } from "next/server";

import {
  GET,
  POST,
  DELETE,
} from "./route";
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

const mockEnsureSourcesCollection = vi.fn().mockResolvedValue(undefined);
const mockEnsureCollection = vi.fn().mockResolvedValue(undefined);
const mockGetAllSources = vi.fn().mockResolvedValue([]);
const mockGetSourceByUrl = vi.fn().mockResolvedValue(null);
const mockAddSource = vi.fn().mockResolvedValue("test-id");
const mockDeleteSource = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../lib/services/vector-store", () => {
  return {
    VectorStore: class MockVectorStore {
      ensureSourcesCollection = mockEnsureSourcesCollection;
      ensureCollection = mockEnsureCollection;
      getAllSources = mockGetAllSources;
      getSourceByUrl = mockGetSourceByUrl;
      addSource = mockAddSource;
      deleteSource = mockDeleteSource;
    },
  };
});

// ============================================================
// 헬퍼 함수
// ============================================================

function createGetRequest(
  authenticated: boolean = true
): NextRequest {
  const headers: Record<string, string> = {};
  if (authenticated) {
    headers.Cookie =
      `${SESSION_COOKIE_NAME}=valid-session-token`;
  }
  return new NextRequest(
    "http://localhost:3000/api/knowledge",
    { method: "GET", headers }
  );
}

function createPostRequest(
  body: Record<string, unknown>,
  authenticated: boolean = true
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authenticated) {
    headers.Cookie =
      `${SESSION_COOKIE_NAME}=valid-session-token`;
  }
  return new NextRequest(
    "http://localhost:3000/api/knowledge",
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );
}

function createDeleteRequest(
  body: Record<string, unknown>,
  authenticated: boolean = true
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authenticated) {
    headers.Cookie =
      `${SESSION_COOKIE_NAME}=valid-session-token`;
  }
  return new NextRequest(
    "http://localhost:3000/api/knowledge",
    {
      method: "DELETE",
      headers,
      body: JSON.stringify(body),
    }
  );
}

beforeEach(() => {
  mockEnsureSourcesCollection.mockReset().mockResolvedValue(undefined);
  mockEnsureCollection.mockReset().mockResolvedValue(undefined);
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
  mockGetSourceByUrl.mockReset().mockResolvedValue(null);
  mockAddSource.mockReset().mockResolvedValue("new-id");
  mockDeleteSource.mockReset().mockResolvedValue(undefined);
});

// ============================================================
// GET /api/knowledge - 인증
// ============================================================

describe("GET /api/knowledge - 인증", () => {
  it("인증되지 않은 요청에 401 응답을 반환한다", async () => {
    const request = createGetRequest(false);
    const response = await GET(request);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다.");
  });
});

// ============================================================
// GET /api/knowledge - 목록 조회
// ============================================================

describe("GET /api/knowledge - 목록 조회", () => {
  it("인증된 요청으로 소스 목록을 반환한다", async () => {
    const request = createGetRequest(true);
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.sources).toBeDefined();
    expect(Array.isArray(body.sources)).toBe(true);
    expect(body.sources).toHaveLength(2);
  });

  it("인덱싱된 소스의 상태를 indexed로 표시한다", async () => {
    const request = createGetRequest(true);
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    const indexedSources = body.sources.filter(
      (s: { indexingStatus: string }) =>
        s.indexingStatus === "indexed"
    );
    expect(indexedSources.length).toBeGreaterThan(0);
  });

  it("인덱싱되지 않은 소스의 상태를 not_indexed로 표시한다", async () => {
    const request = createGetRequest(true);
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    const notIndexedSources = body.sources.filter(
      (s: { indexingStatus: string }) =>
        s.indexingStatus === "not_indexed"
    );
    expect(notIndexedSources.length).toBeGreaterThan(0);
  });

  it("Qdrant 오류 시 500 응답을 반환한다", async () => {
    mockGetAllSources.mockRejectedValue(
      new Error("Qdrant 연결 실패")
    );

    const request = createGetRequest(true);
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

// ============================================================
// POST /api/knowledge - 인증
// ============================================================

describe("POST /api/knowledge - 인증", () => {
  it("인증되지 않은 요청에 401 응답을 반환한다", async () => {
    const request = createPostRequest(
      {
        type: "url",
        url: "https://example.com",
        title: "테스트",
        category: "blog",
      },
      false
    );

    const response = await POST(request);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다.");
  });
});

// ============================================================
// POST /api/knowledge - URL 소스 추가
// ============================================================

describe("POST /api/knowledge - URL 소스 추가", () => {
  it("유효한 URL 소스를 추가하고 200 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "https://new-example.com/post",
      title: "새 포스트",
      category: "blog",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "지식 소스가 추가되었습니다."
    );
    expect(body.source.url).toBe(
      "https://new-example.com/post"
    );
  });

  it("중복 URL 추가 시 400 응답을 반환한다", async () => {
    mockGetSourceByUrl.mockResolvedValue({
      id: "existing-id",
      url: "https://blog.example.com/post-1",
      title: "기존 포스트",
      category: "blog",
      type: "url",
    });

    const request = createPostRequest({
      type: "url",
      url: "https://blog.example.com/post-1",
      title: "중복 테스트",
      category: "blog",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("이미 등록된 URL입니다.");
  });
});

// ============================================================
// POST /api/knowledge - 텍스트 소스 추가
// ============================================================

describe("POST /api/knowledge - 텍스트 소스 추가", () => {
  it("유효한 텍스트 소스를 추가하고 200 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "text",
      url: "text://manual-test",
      title: "직접 입력 테스트",
      category: "manual",
      content: "테스트 마크다운 텍스트 내용입니다.",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.source.type).toBe("text");
    expect(body.source.content).toBe(
      "테스트 마크다운 텍스트 내용입니다."
    );
  });

  it("content가 없는 텍스트 소스 추가 시 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "text",
      url: "text://no-content",
      title: "내용 없음",
      category: "manual",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("입력 검증에 실패했습니다.");
  });
});

// ============================================================
// POST /api/knowledge - 입력 검증
// ============================================================

describe("POST /api/knowledge - 입력 검증", () => {
  it("유효하지 않은 URL 형식에 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "not-a-valid-url",
      title: "테스트",
      category: "blog",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("title이 없으면 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "https://example.com",
      category: "blog",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("category가 없으면 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "https://example.com",
      title: "테스트",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/knowledge - 인증
// ============================================================

describe("DELETE /api/knowledge - 인증", () => {
  it("인증되지 않은 요청에 401 응답을 반환한다", async () => {
    const request = createDeleteRequest(
      { url: "https://example.com" },
      false
    );

    const response = await DELETE(request);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다.");
  });
});

// ============================================================
// DELETE /api/knowledge - 소스 삭제
// ============================================================

describe("DELETE /api/knowledge - 소스 삭제", () => {
  it("존재하는 소스를 삭제하고 200 응답을 반환한다", async () => {
    mockGetSourceByUrl.mockResolvedValue({
      id: "id-1",
      url: "https://blog.example.com/post-1",
      title: "테스트 포스트",
      category: "blog",
      type: "url",
    });

    const request = createDeleteRequest({
      url: "https://blog.example.com/post-1",
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "지식 소스가 삭제되었습니다."
    );
  });

  it("삭제 시 Qdrant에서 소스와 벡터 데이터를 제거한다", async () => {
    mockGetSourceByUrl.mockResolvedValue({
      id: "id-1",
      url: "https://blog.example.com/post-1",
      title: "테스트 포스트",
      category: "blog",
      type: "url",
    });

    const request = createDeleteRequest({
      url: "https://blog.example.com/post-1",
    });

    await DELETE(request);

    expect(mockDeleteSource).toHaveBeenCalledWith(
      "https://blog.example.com/post-1"
    );
  });

  it("존재하지 않는 URL 삭제 시 400 응답을 반환한다", async () => {
    const request = createDeleteRequest({
      url: "https://nonexistent.com",
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe(
      "해당 URL의 지식 소스를 찾을 수 없습니다."
    );
  });
});

// ============================================================
// DELETE /api/knowledge - 입력 검증
// ============================================================

describe("DELETE /api/knowledge - 입력 검증", () => {
  it("url이 없으면 400 응답을 반환한다", async () => {
    const request = createDeleteRequest({});

    const response = await DELETE(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("입력 검증에 실패했습니다.");
  });

  it("빈 url에 400 응답을 반환한다", async () => {
    const request = createDeleteRequest({ url: "" });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });
});
