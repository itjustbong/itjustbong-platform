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

import { POST, readKnowledgeSources } from "./route";
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

const mockRunIndexingPipeline = vi.fn();

vi.mock("../../../lib/services/indexer", () => ({
  runIndexingPipeline: (...args: unknown[]) =>
    mockRunIndexingPipeline(...args),
}));

// ============================================================
// 헬퍼 함수
// ============================================================

function createPostRequest(
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
    "http://localhost:3000/api/index",
    {
      method: "POST",
      headers,
    }
  );
}

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
  mockRunIndexingPipeline.mockReset();
});

afterEach(() => {
  // 테스트 후에도 올바른 상태로 복원
  fs.writeFileSync(CONFIG_PATH, VALID_CONFIG_CONTENT, "utf-8");
});

// ============================================================
// readKnowledgeSources 단위 테스트
// ============================================================

describe("readKnowledgeSources", () => {
  const TEST_DIR = path.join(
    process.cwd(),
    "test-tmp-index"
  );
  const TEST_PATH = path.join(TEST_DIR, "knowledge.json");

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("존재하지 않는 파일 경로에서 빈 배열을 반환한다", () => {
    const result = readKnowledgeSources(
      "/nonexistent/path/knowledge.json"
    );
    expect(result).toEqual([]);
  });

  it("유효한 설정 파일에서 소스 목록을 읽는다", () => {
    fs.writeFileSync(
      TEST_PATH,
      JSON.stringify({
        sources: [
          {
            url: "https://example.com",
            title: "테스트",
            category: "blog",
          },
        ],
      }),
      "utf-8"
    );

    const result = readKnowledgeSources(TEST_PATH);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com");
    expect(result[0].title).toBe("테스트");
    expect(result[0].category).toBe("blog");
    expect(result[0].type).toBe("url");
  });

  it("type이 text인 소스를 올바르게 읽는다", () => {
    fs.writeFileSync(
      TEST_PATH,
      JSON.stringify({
        sources: [
          {
            url: "text://manual-1",
            title: "직접 입력",
            category: "manual",
            type: "text",
            content: "테스트 텍스트",
          },
        ],
      }),
      "utf-8"
    );

    const result = readKnowledgeSources(TEST_PATH);
    expect(result[0].type).toBe("text");
    expect(result[0].content).toBe("테스트 텍스트");
  });

  it("type이 없는 소스는 기본값 url로 설정한다", () => {
    fs.writeFileSync(
      TEST_PATH,
      JSON.stringify({
        sources: [
          {
            url: "https://example.com",
            title: "테스트",
            category: "blog",
          },
        ],
      }),
      "utf-8"
    );

    const result = readKnowledgeSources(TEST_PATH);
    expect(result[0].type).toBe("url");
  });
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

    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다.");
  });
});

// ============================================================
// POST /api/index - 인덱싱 성공
// ============================================================

describe("POST /api/index - 인덱싱 성공", () => {
  it("인덱싱 파이프라인을 실행하고 200 응답을 반환한다", async () => {
    mockRunIndexingPipeline.mockResolvedValue([
      {
        url: "https://example.com",
        status: "success",
        chunksCount: 5,
      },
    ]);

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
  });

  it("knowledge.json의 소스를 인덱싱 파이프라인에 전달한다", async () => {
    mockRunIndexingPipeline.mockResolvedValue([]);

    const request = createPostRequest(true);
    await POST(request);

    expect(mockRunIndexingPipeline).toHaveBeenCalledTimes(1);

    const passedSources = mockRunIndexingPipeline.mock.calls[0][0];
    expect(Array.isArray(passedSources)).toBe(true);
    // knowledge.json에 소스가 있으므로 비어있지 않아야 한다
    expect(passedSources.length).toBeGreaterThan(0);
  });

  it("각 소스의 인덱싱 결과를 반환한다", async () => {
    mockRunIndexingPipeline.mockResolvedValue([
      {
        url: "https://example.com/1",
        status: "success",
        chunksCount: 3,
      },
      {
        url: "https://example.com/2",
        status: "skipped",
      },
      {
        url: "https://example.com/3",
        status: "failed",
        error: "수집 실패",
      },
    ]);

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.results).toHaveLength(3);
    expect(body.results[0].status).toBe("success");
    expect(body.results[0].chunksCount).toBe(3);
    expect(body.results[1].status).toBe("skipped");
    expect(body.results[2].status).toBe("failed");
    expect(body.results[2].error).toBe("수집 실패");
  });

  it("소스가 없는 경우 빈 결과 배열을 반환한다", async () => {
    // 빈 knowledge.json 작성
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ sources: [] }),
      "utf-8"
    );

    mockRunIndexingPipeline.mockResolvedValue([]);

    const request = createPostRequest(true);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.results).toEqual([]);
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
