"use client";

import { Sparkles, Send } from "lucide-react";
import { useRef, useEffect } from "react";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const suggestions = [
  "사용하는 기술 스택은 무엇인가요?",
  "최근에 진행한 프로젝트나 관심있는 학습 분야는 어디인가요?",
  "운영 중인 사이트들의 정보를 알려주세요!",
];

export function WelcomeScreen({
  onSuggestionClick,
  input,
  setInput,
  onSubmit,
  isLoading,
}: WelcomeScreenProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 입력창 자동 높이 조절
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      {/* 타이틀 영역 */}
      <div className="mb-8 flex flex-col items-start w-full max-w-2xl">
        {/* <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30">
          <Sparkles className="h-7 w-7 text-primary" />
        </div> */}
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
          🙋🏻
        </h1>
        <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          블로그와 이력서를 기반으로 답변드립니다!
        </p>
      </div>

      {/* 입력창 영역 - 강조된 스타일 */}
      <div className="w-full max-w-2xl">
        <form onSubmit={onSubmit} className="relative">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/5 transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-xl focus-within:shadow-primary/5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              rows={1}
              className="w-full resize-none bg-transparent px-5 py-4 text-base text-foreground placeholder-muted-foreground outline-none"
            />
            <div className="flex items-center justify-end border-t border-border/30 px-3 py-2">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="전송"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 제안 질문 */}
      <div className="mt-8 flex flex-col items-start gap-3 w-full max-w-2xl">
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onSuggestionClick(text)}
            className="group flex items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-primary" />
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
