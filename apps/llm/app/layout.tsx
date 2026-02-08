import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@repo/ui/header";
import { ThemeProvider } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "itjustbong AI - 블로그 & 이력서 기반 AI 답변",
  description:
    "블로그 글과 이력서를 기반으로 답변하는 AI 서비스입니다. 기술 스택, 프로젝트 경험 등을 질문해보세요.",
  icons: {
    icon: "/icon/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Header
            subdomain="chat"
            logoHref="/"
            showThemeToggle={false}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
