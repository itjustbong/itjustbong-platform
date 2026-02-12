export interface TechStack {
  category: string;
  icon: "code" | "server" | "container" | "sparkles";
  tags: string[];
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  period: string;
  url?: string;
  highlights: string[];
  image?: string;
}

export interface Experience {
  company: string;
  period: string;
  projects: {
    name: string;
    highlights: string[];
  }[];
  activities?: string[];
}

export interface Education {
  school: string;
  major: string;
  period: string;
  gpa?: string;
  note?: string;
}

export interface Community {
  name: string;
  period: string;
  description: string;
  activities: string[];
}

export interface Award {
  year: string;
  title: string;
}

export interface Article {
  title: string;
  date: string;
}

export interface Patent {
  title: string;
}

export const techStacks: TechStack[] = [
  {
    category: "Frontend",
    icon: "code",
    tags: ["React", "Next.js", "TypeScript", "TanStack Query", "Tailwind", "Storybook"],
    description:
      "**FSD/AsyncBoundary** 등으로 구조 설계, 로딩/에러 UX 개선. *반응형/다국어/공통 컴포넌트* 설계 경험.",
  },
  {
    category: "Backend",
    icon: "server",
    tags: ["Node.js", "NestJS", "REST API"],
    description:
      "**CRUD/REST API** 연동 및 간단한 서버 로직 구현 가능.",
  },
  {
    category: "DevOps",
    icon: "container",
    tags: ["Turborepo", "Docker", "Vercel", "AWS"],
    description:
      "**모노레포/컨테이너** 환경 이해 및 배포/운영 경험.",
  },
  {
    category: "AI",
    icon: "sparkles",
    tags: ["Cursor", "Opencode", "Kiro", "RAG"],
    description:
      "다양한 **AI IDE/Agents**를 실무 활용. 기본적인 **RAG 구축/실험** 경험 보유.",
  },
];

export const experiences: Experience[] = [
  {
    company: "LG전자",
    period: "2024.01 ~",
    projects: [
      {
        name: "BS통합관제 프로젝트",
        highlights: [
          "**공통 컴포넌트 라이브러리 구축**: 여러 B2B 서비스의 중복 컴포넌트 구현으로 인한 유지보수 비용 증가 문제를 공통 라이브러리 설계/구현 및 `Storybook` 도입으로 해결, *재사용 기반 마련*",
          "**Unity WebGL 임베딩 최적화**: 페이지 이동 후 Unity 인스턴스 메모리 점유 문제를 *생명주기 제어*로 해결, 로딩 Overlay 추가 및 프론트엔드-Unity 간 **메시지 프로토콜 정의**로 실행 컨텍스트 동기화 구현",
        ],
      },
      {
        name: "교육용 태블릿 관제 프로젝트",
        highlights: [
          "**FSD 아키텍처 도입**: 단일 데이터 소스 중복 사용으로 인한 사이드 이펙트 문제를 *FSD 구조 및 피처 단위 로직 분리*로 해결, 변경 영향 범위 명확화",
          "**전역 에러 핸들링 표준화**: 컴포넌트별 에러 처리 불일치 문제를 `TanStack Query` 전역 에러 핸들링 및 일원화된 UI(모달/에러 화면)로 해결, *일관된 에러 UX 제공*",
        ],
      },
      {
        name: "의료용 모니터 관제 프로젝트",
        highlights: [
          "**API 호출 최적화**: 여러 피처의 동일 엔티티 중복 호출 문제를 `TanStack Query` 기반 **캐싱/공유 구조**로 해결, 전역 에러 핸들링 및 *2분 주기 재호출 로직 표준화*",
          "**AsyncBoundary 기반 로딩 UX 개선**: 느린 외부 API로 인한 전체 페이지 블로킹 문제를 `Suspense` + `ErrorBoundary` 및 스켈레톤 UI 도입으로 해결, **LCP 및 체감 로딩 속도 개선**",
          "**다국어(i18n) 리소스 변환 자동화**: 8개 국어 *1,000+ key* JSON과 엑셀 간 수작업 변환 문제를 dot notation 평탄화 스크립트 구현으로 해결, 검수/적용 프로세스 효율화",
          "**반응형 레이아웃 안정화**: 화면 축소 시 텍스트 겹침/overflow 반복 문제를 `Tailwind` 기반 반응형 레이아웃 적용으로 해결",
        ],
      },
    ],
    activities: [
      "**쉐도우 커미티**: MS 본부 내 제품 기획/UX 개선 활동 참여, *상반기 및 연간 우수 활동자 선정*",
      "**리인벤트 간사**: 팀/담당/실 단위 월별 행사 기획/운영, 조직 문화 및 소통 활성화 기여",
      "**아이디어 공모전**: 자사 제품 개선 아이디어 제안, *서비스플랫폼개발담당 공모전 우수상 수상*",
    ],
  },
  {
    company: "올바름",
    period: "2022.02 ~ 2023.02 (대학 재학 중)",
    projects: [
      {
        name: "조경수 플랫폼 유지보수 및 기능 개선",
        highlights: [
          "인프라/운영 관점에서 **비용 효율화**에 집중하여 서비스 안정적 운영",
        ],
      },
      {
        name: "퍼널 마케팅 플랫폼 리드",
        highlights: [
          "**기획/디자인/개발/지원사업** 대응까지 전반을 책임지고 진행",
          "SMS 발송 연동, 랜딩 페이지 및 폼 기능 개발로 *캠페인 운영 효율 향상*",
        ],
      },
    ],
  },
  {
    company: "소셜 그라운드",
    period: "2021.07 ~ 2022.01 (대학 재학 중 / 공동 창업)",
    projects: [
      {
        name: "초기 스타트업 실무 담당",
        highlights: [
          "개발팀 운영/지원사업/외주 관리/**특허 출원** 등 서비스 전반 설계/운영",
          "**ESG 매칭 플랫폼** 기획/개발: 학생과 기업을 연결하는 플랫폼 기획/개발로 *서비스 기본 골격 구축*",
        ],
      },
    ],
  },
  {
    company: "밀레코리아",
    period: "2020.12 ~ 2021.06 (대학 재학 중)",
    projects: [
      {
        name: "사내 업무 자동화 프로그램 개발",
        highlights: [
          "**정산/최저가 스크래핑/재고 관리 자동화**로 반복 업무 감소 및 정확도 향상",
        ],
      },
      {
        name: "패밀리몰/CS 시스템 구축",
        highlights: [
          "약 **3만 명** 사용자, **3억 원 이상** 매출 발생하는 온라인 채널 구축",
          "카카오톡 연계 CS 플랫폼 개발로 *고객 응대 흐름 개선*",
        ],
      },
    ],
  },
];

export const personalProjects: Project[] = [
  {
    id: "lemme-blind-date",
    name: "Lemme Blind Date",
    description: "친구의 친구를 소개시켜주는 **지인 네트워크 기반 매칭 서비스**",
    period: "2026.02 ~",
    url: "https://lemmeblind.date",
    highlights: [
      "**Next.js App Router 풀스택 구현**: Server Components + Server Actions로 별도 API 서버 없이 구현, `Drizzle ORM` + `Supabase PostgreSQL` 조합으로 **타입 안전한 DB 접근**",
      "**Supabase RLS 기반 보안**: 데이터베이스 수준 행 단위 접근 제어(RLS) 정책 설계, 방장/등록자 권한 분리로 *애플리케이션 + DB 이중 검증* 구현",
      "**다국어 및 캐싱 최적화**: `next-intl` 기반 i18n + IP 지역 감지 자동 로케일 설정, React `cache()` + `unstable_cache()` 조합으로 **DB 부하 감소**",
    ],
    image: "/projects/lemme-blind-date.png",
  },
  {
    id: "whales-wallet",
    name: "What's in Whale's Wallet?",
    description: "**SEC 13F** 공시 데이터 기반 기관 포트폴리오 탐색 서비스",
    period: "2026.01 ~",
    url: "https://whales-wallet.com",
    highlights: [
      "**풀스택 모노레포 구축**: `Turborepo` 기반 `NestJS` 백엔드 + `Next.js` 프론트엔드 운영, `Python` ETL 파이프라인으로 SEC EDGAR XML 파싱 및 `PostgreSQL` 적재",
      "**프론트엔드 아키텍처 설계**: *FSD 구조*(entities/features/widgets), i18n, 공유 패키지(`@repo/ui`, `@repo/api-client`) 적용으로 **타입 안전한 API 연동** 및 재사용 가능한 구조 구현",
    ],
    image: "/projects/whales-wallet.png",
  },
  {
    id: "itjustbong-platform",
    name: "itjustbong 플랫폼",
    description: "`Turborepo` 모노레포 기반 개인 플랫폼 (blog, resume, llm)",
    period: "2025.12 ~",
    url: "https://chat.itjustbong.com",
    highlights: [
      "**모노레포 아키텍처**: `Turborepo` + `pnpm workspace` 기반 apps(blog/resume/llm) + packages(ui/shared/config) 구조, 공유 패키지로 여러 `Next.js` 앱 간 *재사용성 및 개발 효율 향상*",
      "**blog**: `MDX` 기반 파일 시스템 콘텐츠 관리, sitemap/robots/JSON-LD/동적 OG 이미지 등 **SEO 최적화**, `Mermaid` 다이어그램 및 관리자 에디터 지원",
      "**resume**: 데이터 기반 이력서 웹앱, `html-to-image` + `jsPDF` 활용 **PDF 다운로드** 기능, 다크모드/라이트모드 대응 및 *반응형 레이아웃*",
      "**llm**: `Gemini` + `Qdrant` 기반 **RAG 답변 서비스**, 블로그/이력서 콘텐츠를 벡터 검색하여 출처 명시된 스트리밍 답변 생성, `Docker Compose` 배포",
    ],
    image: "/projects/log-itjustbong.png",
  },
  {
    id: "pickiverse",
    name: "피키버스",
    description: "이상형 월드컵을 쉽게 만들고 공유할 수 있는 **크로스 플랫폼**",
    period: "2025.01 ~",
    url: "https://pickiverse.com",
    highlights: [
      "**크로스 플랫폼 서비스 구축**: `Flutter`(iOS/Android) + `Next.js`(Web) 기반 서비스 개발, 웹뷰 활용으로 로그인/게임 생성 등 공통 기능 재사용, `Fastlane` 기반 앱 배포 자동화",
      "**이미지 저장/트래픽 비용 최적화**: AWS S3에서 `Cloudflare Images`로 전환, 업로드 용량 제한(10MB) 및 화면별 해상도 최적화(image variant) 적용으로 월 비용 **$32+ → $5** 수준으로 절감",
      "**프론트엔드 성능/UX 개선**: `Next.js` SSR + 스켈레톤 로딩으로 초기 렌더링 속도 개선, *i18n 및 locale middleware* 구현으로 사용자 선호 언어 기반 자동 리다이렉션 지원",
      "**인프라 비용 최적화**: `Vercel`(프론트엔드) + `Supabase`(DB) 활용, 백엔드 ARM 기반 전환 및 certbot/nginx 직접 HTTPS 구성으로 ALB 비용 제거, 전체 인프라 비용 **약 10% 이상 절감**",
    ],
    image: "/projects/pickiverse.png",
  },
];

export const education: Education = {
  school: "숭실대학교",
  major: "AI융합학부",
  period: "2017.03 ~ 2024.02",
  gpa: "4.17",
  note: "창업, 성적, 비전 장학금 및 수상",
};

export const communities: Community[] = [
  {
    name: "Google Developer Group",
    period: "2022.09 ~ 2024.02",
    description: "대학생 개발자들의 **기술 스터디 및 프로젝트** 커뮤니티",
    activities: [
      "**프레임워크 없는(있는) 프론트엔드 스터디**: 다양한 FE 스택으로 투두앱 구현, 세미나/코드잼 진행, *스택 장단점 분석 및 패키지 매니저 비교*",
      "**세상을 바꾸는 프론트엔드 스터디**: 프론트엔드 트렌드/인사이트 공유, 실무 고민 논의",
      "**팀 프로젝트**: 구글 솔루션 챌린지 *SSUNG DELIVERY*, GDSC 페스티벌 *WOW meet* 프로젝트 진행",
    ],
  },
  {
    name: "GDXC",
    period: "2024.06 ~ 진행 중",
    description: "재학생과 졸업생을 잇는 **개발자 커뮤니티 창립 멤버**",
    activities: [
      "**네트워킹**: 졸업생/재학생 네트워킹 파티 운영",
      "**개발 문화 공유**: 직장인들의 회사별 개발 문화/프로세스 소개",
      "**기술 공유**: 기술 및 정보 공유, Q&A 세션 진행",
    ],
  },
];

export const awards: Award[] = [
  { year: "2018", title: "메이커톤 위드캠프 1위" },
  { year: "2018", title: "메이커페어 전시회 참여" },
  { year: "2018", title: "교내 경진대회 장려상" },
  { year: "2021", title: "두드림 프로그램 우수상" },
  { year: "2021", title: "캠퍼스 CEO 캡스톤 어워즈 종합대상" },
  { year: "2021", title: "예비창업패키지 선정" },
  { year: "2021", title: "숭실대학교 Pre스타트업 선정 (매에컴퍼니)" },
  { year: "2021", title: "스타트업 in 동작 선정" },
  { year: "2022", title: "숭실대학교 Pre 스타트업 선정 (플로지다)" },
  { year: "2023", title: "숭실대학교 소프트웨어공모전 총장상" },
  { year: "2023", title: "Pre 스타트업 선정 (Sendee)" },
  { year: "2023", title: "카카오 관광데이터 활용 공모전 장려상" },
  { year: "2023", title: "창업유망팀 300 경진대회 성장트랙 선정" },
  { year: "2025", title: "LG전자 SI 공모전 우수상 수상" },
];

export const articles: Article[] = [
  { title: "캠퍼스 CEO 육성사업 제2회 캡스톤어워즈", date: "2021.07" },
  { title: "한큐플랜트 플랫폼 런칭", date: "2021.12" },
  { title: "GDSC LMS 개선 프로젝트 세미나 발표", date: "2022.11" },
  {
    title: "ESG 관련 역량과 실무 ... 스타트업 '소셜그라운드'",
    date: "2022.12",
  },
];

export const patents: Patent[] = [
  {
    title:
      "Method For Providing Local Advertisement Including Advertiser Business Place",
  },
  { title: "Mixed Beverage Manufacturing and Ordering Service Delivery System" },
  { title: "Beverage Dispensing System" },
];

export const profile = {
  name: "봉승우",
  title: "Frontend Dev.",
  tagline: "", // 선택사항: 없으면 undefined 또는 삭제
  links: {
    github: "https://github.com/itjustbong",
    linkedin: "https://www.linkedin.com/in/itjustbong/",
    email: "qhdgkdbs@gmail.com",
  },
};
