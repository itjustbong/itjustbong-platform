import { Github, Linkedin, type LucideIcon } from "lucide-react";

// 개발자가 만든 사이트/프로젝트
export interface DeveloperSite {
  name: string;
  url: string;
  description?: string;
}

export const developerSites: DeveloperSite[] = [
  {
    name: "Pickiverse",
    url: "https://www.pickiverse.com/",
    description: "피키버스 서비스",
  },
  {
    name: "What's in whale's wallet?",
    url: "https://whales-wallet.com/",
    description: "고래 지갑 추적 서비스",
  },
    {
    name: "Lemme Blind Date",
    url: "https://lemmeblind.date",
    description: "친구소개 플랫폼",
  },
];


export const platformLinks: DeveloperSite[] = [
  {
    name: "테크 블로그",
    url: "https://log.itjustbong.com/",
  },
  {
    name: "RAG 기반 질의응답",
    url: "https://chat.itjustbong.com/",
  },
  {
    name: "이력서",
    url: "https://resume.itjustbong.com/",
  },
];

// 소셜 링크 정보
export interface SocialLink {
  name: string;
  url: string;
  icon: LucideIcon;
  label: string;
}

export const socialLinks: SocialLink[] = [
  {
    name: "GitHub",
    url: "https://github.com/itjustbong",
    icon: Github,
    label: "GitHub",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/%EC%8A%B9%EC%9A%B0-%EB%B4%89-19108514a/",
    icon: Linkedin,
    label: "LinkedIn",
  },
];

