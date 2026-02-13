# LLM RAG Service

블로그와 이력서 콘텐츠를 기반으로 한 RAG(Retrieval-Augmented Generation) 답변 서비스.
사용자가 질문을 입력하면 사전에 등록된 지식 데이터를 검색하여 출처가 명시된 한국어 답변을 스트리밍으로 생성한다.

## 서비스 주소

- https://chat.itjustbong.com/

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **LLM**: Google Gemini 2.5 Flash (Vercel AI SDK)
- **임베딩**: Gemini Embedding API (`@google/genai`)
- **벡터DB**: Qdrant (`@qdrant/js-client-rest`)
- **검색**: Qdrant 네이티브 하이브리드 검색 (dense + BM25 sparse)
- **UI**: Tailwind CSS
- **테스트**: Vitest + fast-check
- **배포**: Docker Compose (Next.js standalone + Qdrant)

## 프로젝트 구조

```
apps/llm/
├── app/
│   ├── page.tsx              # 채팅 UI
│   ├── admin/page.tsx        # 지식 베이스 관리 UI
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── chat/route.ts     # 채팅 API (스트리밍)
│       ├── index/route.ts    # 인덱싱 API
│       ├── knowledge/route.ts # 지식 소스 CRUD
│       └── admin/auth/route.ts # 관리자 인증
├── lib/
│   ├── config/               # 환경 변수, 지식 설정 로더
│   ├── services/             # 핵심 서비스 (수집, 청킹, 임베딩, 검색, 답변 생성 등)
│   └── types.ts
├── knowledge.json            # 지식 데이터 설정
├── Dockerfile
└── .env.example
```

## 로컬 개발 환경 설정

### 1. 사전 요구사항

- Node.js 22+
- pnpm 9+
- Docker (Qdrant 실행용)
- Google Gemini API 키 ([Google AI Studio](https://aistudio.google.com/)에서 발급)

### 2. 환경 변수 설정

```bash
cp apps/llm/.env.example apps/llm/.env
```

`.env` 파일을 열고 필수 값을 입력한다:

```env
GEMINI_API_KEY=your-gemini-api-key
QDRANT_URL=http://localhost:6333
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
```

### 3. Qdrant 실행

```bash
docker run -d --name qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v qdrant_data:/qdrant/storage \
  qdrant/qdrant:latest
```

또는 Docker Compose로 Qdrant만 실행:

```bash
docker compose up qdrant -d
```

### 4. 의존성 설치 및 개발 서버 실행

프로젝트 루트에서:

```bash
pnpm install
pnpm dev:llm
```

브라우저에서 [http://localhost:3001](http://localhost:3001) 접속.

### 5. 지식 베이스 인덱싱

1. [http://localhost:3001/admin](http://localhost:3001/admin) 접속
2. 환경 변수에 설정한 아이디/비밀번호로 로그인
3. URL 또는 텍스트 소스 추가
4. "전체 재인덱싱" 버튼 클릭

또는 `knowledge.json`을 직접 편집한 후 관리 페이지에서 인덱싱을 실행할 수 있다.

### 문제 해결: `ECONNREFUSED` / `fetch failed` 오류

채팅 API에서 `TypeError: fetch failed` 또는 `ECONNREFUSED`가 발생하면 **Qdrant가 실행 중이지 않은 상태**입니다.

1. Qdrant를 실행하세요:
   ```bash
   docker compose up qdrant -d
   ```
2. Qdrant 실행 후에는 RAG(문서 검색 기반 답변)가 정상 동작합니다.

**참고**: Qdrant가 없어도 채팅은 동작합니다. 문서 검색 없이 LLM만 사용한 응답이 반환됩니다. 콘솔에 `[LLM] Qdrant 연결 실패` 경고가 표시됩니다.

## 테스트

```bash
# 모노레포 루트에서
pnpm --filter @apps/llm run test

# watch 모드
pnpm --filter @apps/llm run test:watch
```

## 배포 가이드

### Docker Compose 배포 (권장)

프로젝트 루트에 `docker-compose.yml`이 포함되어 있다. Qdrant와 Next.js 앱을 함께 실행한다.

#### 1. 환경 변수 준비

```bash
cp apps/llm/.env.example apps/llm/.env
# .env 파일에 실제 값 입력
```

배포 환경에서는 `QDRANT_URL`을 Docker 내부 네트워크 주소로 변경한다:

```env
QDRANT_URL=http://qdrant:6333
```

#### 2. 빌드 및 실행

```bash
docker compose up -d --build
```

- Next.js 앱: `http://your-server:3002`
- Qdrant 대시보드: `http://your-server:6333/dashboard`

#### 3. 인덱싱 실행

배포 후 관리 페이지(`http://your-server:3002/admin`)에서 지식 소스를 등록하고 인덱싱을 실행한다.

#### 4. 서비스 관리

```bash
# 로그 확인
docker compose logs -f llm-app

# 재시작
docker compose restart llm-app

# 중지
docker compose down

# Qdrant 데이터 포함 완전 삭제
docker compose down -v
```

### 수동 빌드 배포

Docker 없이 직접 빌드하여 배포할 수도 있다.

```bash
# 빌드
pnpm --filter @apps/llm run build

# standalone 출력물 실행
node apps/llm/.next/standalone/apps/llm/server.js
```

`standalone` 디렉토리에 필요한 모든 파일이 포함되므로 해당 디렉토리만 서버에 배포하면 된다.
단, `apps/llm/public`과 `apps/llm/.next/static`은 별도로 복사해야 한다.

### 환경 변수 참조

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API 키 |
| `QDRANT_URL` | ✅ | - | Qdrant 서버 URL |
| `ADMIN_USERNAME` | ✅ | - | 관리자 아이디 |
| `ADMIN_PASSWORD` | ✅ | - | 관리자 비밀번호 |
| `GEMINI_LLM_MODEL` | - | `gemini-2.5-flash` | LLM 모델명 |
| `GEMINI_EMBEDDING_MODEL` | - | `gemini-embedding-001` | 임베딩 모델명 |
| `QDRANT_COLLECTION` | - | `knowledge_chunks` | Qdrant 컬렉션명 |
| `DAILY_REQUEST_LIMIT` | - | `20` | 사용자당 일일 요청 한도 |
