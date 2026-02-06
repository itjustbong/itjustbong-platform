import fs from "fs";
import path from "path";

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { NextRequest } from "next/server";

import {
  GET,
  POST,
  DELETE,
  readKnowledgeConfig,
  writeKnowledgeConfig,
} from "./route";
import { SESSION_COOKIE_NAME } from "../admin/auth/route";

// ============================================================
// 모킹
// ============================================================

vi.mock("../../../../lib/config/env", () => ({
  validateEnv: () => ({
    GEMINI_API_KEY: "test-api-key",
    QDRANT_URL: "http://localhost:6333",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "secret123",
    GEMINI_LLM_MODEL: "gemini-2.5-flash",
    GEMINI_EMBEDDING_MODEL: "gemini-embedding-001",
    QDRANT_COLLECTION: "knowledge_chunks",
    DAILY_REQUEST_LIMIT: 20,
  }),
}));

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

const mockDeleteBySourceUrl = vi.fn();
const mockGetContentHashByUrl = vi.fn();

vi.mock("../../../lib/services/vector-store", () => {
  return {
    VectorStore: class MockVectorStore {
      ensureCollection = vi.fn().mockResolvedValue(undefined);
      deleteBySourceUrl = mockDeleteBySourceUrl;
      getContentHashByUrl = mockGetContentHashByUrl;
    },
  };
});

// ============================================================
// knowledge.json 백업/복원
// ============================================================

const CONFIG_PATH = path.join(
  process.cwd(),
  "knowledge.json"
);

const VALID_CONFIG_CONTENT = JSON.stringify({
  sources: [
    {
      url: "https://blog.itjustbong.me/posts/tech-blog-without-database",
      title: "데이터베이스 없이 기술 블로그 만들기",
      category: "blog",
    },
    {
      url: "https://blog.itjustbong.me/posts/monorepo-shared-types",
      title: "모노레포에서 공유 타입 관리하기",
      category: "blog",
    },
  ],
}, null, 2) + "\n";

beforeEach(() => {
  // 매 테스트 전에 knowledge.json을 올바른 상태로 복원
  fs.writeFileSync(CONFIG_PATH, VALID_CONFIG_CONTENT, "utf-8");
  mockDeleteBySourceUrl.mockReset();
  mockGetContentHashByUrl.mockReset();
  mockDeleteBySourceUrl.mockResolvedValue(undefined);
  mockGetContentHashByUrl.mockResolvedValue(null);
});

afterEach(() => {
  // 테스트 후에도 올바른 상태로 복원
  fs.writeFileSync(CONFIG_PATH, VALID_CONFIG_CONTENT, "utf-8");
});

// ============================================================
// 헬퍼 함수
// ============================================================

const TEST_CONFIG_DIR = path.join(
  process.cwd(),
  "test-tmp-knowledge"
);
const TEST_CONFIG_PATH = path.join(
  TEST_CONFIG_DIR,
  "knowledge.json"
);

function createTestConfig(
  sources: Array<{
    url: string;
    title: string;
    category: string;
    type?: string;
    content?: string;
  }>
): void {
  if (!fs.existsSync(TEST_CONFIG_DIR)) {
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(
    TEST_CONFIG_PATH,
    JSON.stringify({ sources }, null, 2),
    "utf-8"
  );
}

function cleanupTestConfig(): void {
  if (fs.existsSync(TEST_CONFIG_DIR)) {
    fs.rmSync(TEST_CONFIG_DIR, {
      recursive: true,
      force: true,
    });
  }
}

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

// ============================================================
// readKnowledgeConfig 단위 테스트
// ============================================================

describe("readKnowledgeConfig", () => {
  afterEach(() => {
    cleanupTestConfig();
  });

  it("존재하지 않는 파일 경로에서 빈 소스 목록을 반환한다", () => {
    const result = readKnowledgeConfig(
      "/nonexistent/path/knowledge.json"
    );
    expect(result.sources).toEqual([]);
  });

  it("유효한 설정 파일에서 소스 목록을 읽는다", () => {
    createTestConfig([
      {
        url: "https://example.com",
        title: "테스트",
        category: "blog",
      },
    ]);

    const result = readKnowledgeConfig(TEST_CONFIG_PATH);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://example.com");
    expect(result.sources[0].title).toBe("테스트");
    expect(result.sources[0].category).toBe("blog");
    expect(result.sources[0].type).toBe("url");
    expect(result.sources[0].indexingStatus).toBe(
      "not_indexed"
    );
  });

  it("type이 text인 소스를 올바르게 읽는다", () => {
    createTestConfig([
      {
        url: "text://manual-1",
        title: "직접 입력",
        category: "manual",
        type: "text",
        content: "테스트 텍스트 내용",
      },
    ]);

    const result = readKnowledgeConfig(TEST_CONFIG_PATH);
    expect(result.sources[0].type).toBe("text");
    expect(result.sources[0].content).toBe(
      "테스트 텍스트 내용"
    );
  });
});

// ============================================================
// writeKnowledgeConfig 단위 테스트
// ============================================================

describe("writeKnowledgeConfig", () => {
  beforeEach(() => {
    cleanupTestConfig();
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
      fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    cleanupTestConfig();
  });

  it("소스 목록을 JSON 파일로 저장한다", () => {
    writeKnowledgeConfig(
      [
        {
          url: "https://example.com",
          title: "테스트",
          category: "blog",
        },
      ],
      TEST_CONFIG_PATH
    );

    const content = fs.readFileSync(
      TEST_CONFIG_PATH,
      "utf-8"
    );
    const parsed = JSON.parse(content);
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.sources[0].url).toBe(
      "https://example.com"
    );
  });

  it("텍스트 소스를 type과 content 포함하여 저장한다", () => {
    writeKnowledgeConfig(
      [
        {
          url: "text://manual-1",
          title: "직접 입력",
          category: "manual",
          type: "text",
          content: "텍스트 내용",
        },
      ],
      TEST_CONFIG_PATH
    );

    const content = fs.readFileSync(
      TEST_CONFIG_PATH,
      "utf-8"
    );
    const parsed = JSON.parse(content);
    expect(parsed.sources[0].type).toBe("text");
    expect(parsed.sources[0].content).toBe("텍스트 내용");
  });

  it("URL 소스는 type과 content를 포함하지 않는다", () => {
    writeKnowledgeConfig(
      [
        {
          url: "https://example.com",
          title: "테스트",
          category: "blog",
        },
      ],
      TEST_CONFIG_PATH
    );

    const content = fs.readFileSync(
      TEST_CONFIG_PATH,
      "utf-8"
    );
    const parsed = JSON.parse(content);
    expect(parsed.sources[0].type).toBeUndefined();
    expect(parsed.sources[0].content).toBeUndefined();
  });
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
  });

  it("인덱싱된 소스의 상태를 indexed로 표시한다", async () => {
    mockGetContentHashByUrl.mockResolvedValue("some-hash");

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

  it("Qdrant 오류 시 not_indexed로 폴백한다", async () => {
    mockGetContentHashByUrl.mockRejectedValue(
      new Error("Qdrant 연결 실패")
    );

    const request = createGetRequest(true);
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    body.sources.forEach(
      (s: { indexingStatus: string }) => {
        expect(s.indexingStatus).toBe("not_indexed");
      }
    );
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
    const request = createPostRequest({
      type: "url",
      url: "https://blog.itjustbong.me/posts/tech-blog-without-database",
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

    const body = await response.json();
    expect(body.error).toBe("입력 검증에 실패했습니다.");
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

  it("type이 없으면 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      url: "https://example.com",
      title: "테스트",
      category: "blog",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("빈 title에 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "https://example.com",
      title: "",
      category: "blog",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("빈 category에 400 응답을 반환한다", async () => {
    const request = createPostRequest({
      type: "url",
      url: "https://example.com",
      title: "테스트",
      category: "",
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
    const request = createDeleteRequest({
      url: "https://blog.itjustbong.me/posts/tech-blog-without-database",
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "지식 소스가 삭제되었습니다."
    );
  });

  it("삭제 시 Qdrant에서 벡터 데이터를 제거한다", async () => {
    const request = createDeleteRequest({
      url: "https://blog.itjustbong.me/posts/tech-blog-without-database",
    });

    await DELETE(request);

    expect(
      mockDeleteBySourceUrl
    ).toHaveBeenCalledWith(
      "https://blog.itjustbong.me/posts/tech-blog-without-database"
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

  it("Qdrant 오류가 발생해도 설정 파일에서 소스를 삭제한다", async () => {
    mockDeleteBySourceUrl.mockRejectedValue(
      new Error("Qdrant 연결 실패")
    );

    const request = createDeleteRequest({
      url: "https://blog.itjustbong.me/posts/tech-blog-without-database",
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
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
