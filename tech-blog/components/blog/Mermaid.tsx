"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

// 차분한 라이트 모드 색상
const lightThemeVariables = {
  // 기본 색상
  primaryColor: "#e8f4f8",
  primaryTextColor: "#374151",
  primaryBorderColor: "#94a3b8",
  // 라인/화살표
  lineColor: "#94a3b8",
  // 노드 색상
  secondaryColor: "#f1f5f9",
  tertiaryColor: "#f8fafc",
  // 텍스트
  textColor: "#374151",
  // 배경
  background: "#ffffff",
  mainBkg: "#f1f5f9",
  // 노트, 시퀀스 다이어그램
  noteBkgColor: "#fef9c3",
  noteTextColor: "#713f12",
  noteBorderColor: "#fde047",
  // 액터
  actorBkg: "#e0f2fe",
  actorBorder: "#7dd3fc",
  actorTextColor: "#0c4a6e",
  // 시그널
  signalColor: "#64748b",
  signalTextColor: "#334155",
};

// 차분한 다크 모드 색상
const darkThemeVariables = {
  // 기본 색상
  primaryColor: "#1e3a5f",
  primaryTextColor: "#e2e8f0",
  primaryBorderColor: "#475569",
  // 라인/화살표
  lineColor: "#64748b",
  // 노드 색상
  secondaryColor: "#1e293b",
  tertiaryColor: "#0f172a",
  // 텍스트
  textColor: "#e2e8f0",
  // 배경
  background: "#0f172a",
  mainBkg: "#1e293b",
  // 노트, 시퀀스 다이어그램
  noteBkgColor: "#422006",
  noteTextColor: "#fef3c7",
  noteBorderColor: "#a16207",
  // 액터
  actorBkg: "#0c4a6e",
  actorBorder: "#0284c7",
  actorTextColor: "#e0f2fe",
  // 시그널
  signalColor: "#94a3b8",
  signalTextColor: "#cbd5e1",
};

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;

      // 테마에 따라 mermaid 설정 변경
      const isDark = resolvedTheme === "dark";
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        fontFamily: "inherit",
        themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
      });

      try {
        // Generate unique id for each diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError("다이어그램을 렌더링할 수 없습니다.");
      }
    };

    renderChart();
  }, [chart, resolvedTheme]);

  if (error) {
    return (
      <div className="my-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
        <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-border/40 bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
