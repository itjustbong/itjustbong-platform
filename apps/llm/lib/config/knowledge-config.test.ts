import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { stringify as stringifyYaml } from "yaml";
import {
  validateKnowledgeConfig,
  loadKnowledgeConfig,
  parseFileContent,
} from "./knowledge-config";

describe("Knowledge Config 로더", () => {
  const VALID_SOURCE = {
    url: "https://blog.example.com/post-1",
    title: "블로그 포스트",
    category: "blog",
  };

  const VALID_CONFIG = {
    sources: [VALID_SOURCE],
  };

  // ============================================================
  // validateKnowledgeConfig
  // ============================================================

  describe("validateKnowledgeConfig", () => {
    it("유효한 설정 객체는 검증을 통과한다", () => {
      const result = validateKnowledgeConfig(VALID_CONFIG);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("여러 소스가 포함된 설정도 검증을 통과한다", () => {
      const config = {
        sources: [
          VALID_SOURCE,
          {
            url: "https://resume.example.com",
            title: "이력서",
            category: "resume",
          },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(true);
    });

    it("type 필드가 없으면 기본값 'url'이 적용된다", () => {
      const result = validateKnowledgeConfig(VALID_CONFIG);
      expect(result.success).toBe(true);
    });

    it("type이 'text'이고 content가 있는 소스도 검증을 통과한다", () => {
      const config = {
        sources: [
          {
            url: "https://example.com",
            title: "직접 입력",
            category: "manual",
            type: "text",
            content: "직접 입력한 텍스트",
          },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(true);
    });

    it("sources가 빈 배열이면 검증에 실패한다", () => {
      const result = validateKnowledgeConfig({ sources: [] });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("sources가 없으면 검증에 실패한다", () => {
      const result = validateKnowledgeConfig({});
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("url이 누락되면 검증에 실패한다", () => {
      const config = {
        sources: [{ title: "제목", category: "blog" }],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("title이 누락되면 검증에 실패한다", () => {
      const config = {
        sources: [
          { url: "https://example.com", category: "blog" },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("category가 누락되면 검증에 실패한다", () => {
      const config = {
        sources: [
          { url: "https://example.com", title: "제목" },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("유효하지 않은 URL이면 검증에 실패한다", () => {
      const config = {
        sources: [
          {
            url: "not-a-valid-url",
            title: "제목",
            category: "blog",
          },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes("URL"))).toBe(true);
    });

    it("title이 빈 문자열이면 검증에 실패한다", () => {
      const config = {
        sources: [
          {
            url: "https://example.com",
            title: "",
            category: "blog",
          },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
    });

    it("category가 빈 문자열이면 검증에 실패한다", () => {
      const config = {
        sources: [
          {
            url: "https://example.com",
            title: "제목",
            category: "",
          },
        ],
      };
      const result = validateKnowledgeConfig(config);
      expect(result.success).toBe(false);
    });

    it("null 입력은 검증에 실패한다", () => {
      const result = validateKnowledgeConfig(null);
      expect(result.success).toBe(false);
    });

    it("문자열 입력은 검증에 실패한다", () => {
      const result = validateKnowledgeConfig("invalid");
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // parseFileContent
  // ============================================================

  describe("parseFileContent", () => {
    it("JSON 파일을 올바르게 파싱한다", () => {
      const content = JSON.stringify(VALID_CONFIG);
      const result = parseFileContent("config.json", content);
      expect(result).toEqual(VALID_CONFIG);
    });

    it("YAML 파일(.yaml)을 올바르게 파싱한다", () => {
      const content = stringifyYaml(VALID_CONFIG);
      const result = parseFileContent("config.yaml", content);
      expect(result).toEqual(VALID_CONFIG);
    });

    it("YAML 파일(.yml)을 올바르게 파싱한다", () => {
      const content = stringifyYaml(VALID_CONFIG);
      const result = parseFileContent("config.yml", content);
      expect(result).toEqual(VALID_CONFIG);
    });

    it("대소문자 구분 없이 확장자를 인식한다", () => {
      const content = JSON.stringify(VALID_CONFIG);
      const result = parseFileContent("config.JSON", content);
      expect(result).toEqual(VALID_CONFIG);
    });

    it("지원하지 않는 확장자는 오류를 발생시킨다", () => {
      expect(() => parseFileContent("config.txt", "{}")).toThrow(
        "지원하지 않는 파일 형식입니다"
      );
    });

    it("지원하지 않는 확장자 오류에 확장자 정보가 포함된다", () => {
      expect(() => parseFileContent("config.xml", "{}")).toThrow(
        ".xml"
      );
    });
  });

  // ============================================================
  // loadKnowledgeConfig
  // ============================================================

  describe("loadKnowledgeConfig", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kc-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("유효한 JSON 파일을 로드한다", () => {
      const filePath = path.join(tmpDir, "knowledge.json");
      fs.writeFileSync(filePath, JSON.stringify(VALID_CONFIG));

      const config = loadKnowledgeConfig(filePath);
      expect(config.sources).toHaveLength(1);
      expect(config.sources[0].url).toBe(VALID_SOURCE.url);
      expect(config.sources[0].title).toBe(VALID_SOURCE.title);
      expect(config.sources[0].category).toBe(VALID_SOURCE.category);
      expect(config.sources[0].type).toBe("url");
    });

    it("유효한 YAML 파일을 로드한다", () => {
      const filePath = path.join(tmpDir, "knowledge.yaml");
      fs.writeFileSync(filePath, stringifyYaml(VALID_CONFIG));

      const config = loadKnowledgeConfig(filePath);
      expect(config.sources).toHaveLength(1);
      expect(config.sources[0].url).toBe(VALID_SOURCE.url);
    });

    it("유효한 YML 파일을 로드한다", () => {
      const filePath = path.join(tmpDir, "knowledge.yml");
      fs.writeFileSync(filePath, stringifyYaml(VALID_CONFIG));

      const config = loadKnowledgeConfig(filePath);
      expect(config.sources).toHaveLength(1);
    });

    it("존재하지 않는 파일은 오류를 발생시킨다", () => {
      const filePath = path.join(tmpDir, "nonexistent.json");
      expect(() => loadKnowledgeConfig(filePath)).toThrow(
        "설정 파일을 찾을 수 없습니다"
      );
    });

    it("유효하지 않은 설정 파일은 오류를 발생시킨다", () => {
      const filePath = path.join(tmpDir, "invalid.json");
      fs.writeFileSync(filePath, JSON.stringify({ sources: [] }));

      expect(() => loadKnowledgeConfig(filePath)).toThrow(
        "설정 파일 검증 실패"
      );
    });

    it("샘플 knowledge.json 파일을 로드할 수 있다", () => {
      // 병렬 테스트 간 간섭을 방지하기 위해 임시 파일 사용
      const samplePath = path.join(tmpDir, "sample-knowledge.json");
      fs.writeFileSync(
        samplePath,
        JSON.stringify({
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
        }, null, 2),
        "utf-8"
      );
      const config = loadKnowledgeConfig(samplePath);
      expect(config.sources.length).toBeGreaterThanOrEqual(1);
      config.sources.forEach((source) => {
        expect(source.url).toBeTruthy();
        expect(source.title).toBeTruthy();
        expect(source.category).toBeTruthy();
      });
    });

    it("JSON과 YAML로 동일한 설정을 로드하면 같은 결과를 반환한다", () => {
      const jsonPath = path.join(tmpDir, "config.json");
      const yamlPath = path.join(tmpDir, "config.yaml");

      const multiConfig = {
        sources: [
          VALID_SOURCE,
          {
            url: "https://resume.example.com",
            title: "이력서",
            category: "resume",
          },
        ],
      };

      fs.writeFileSync(jsonPath, JSON.stringify(multiConfig));
      fs.writeFileSync(yamlPath, stringifyYaml(multiConfig));

      const jsonConfig = loadKnowledgeConfig(jsonPath);
      const yamlConfig = loadKnowledgeConfig(yamlPath);

      expect(jsonConfig).toEqual(yamlConfig);
    });
  });
});
