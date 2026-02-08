"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, LinkIcon } from "lucide-react";
import {
  developerSites,
  platformLinks,
  socialLinks,
} from "@repo/shared/site-data";

export function InfoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 시 팝업 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        aria-label="개발자 정보"
      >
        <LinkIcon className="h-4 w-4" />
        {/* 개발자 사이트 수 뱃지 */}
        {developerSites.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground/80 text-[10px] font-semibold text-background backdrop-blur-sm">
            {developerSites.length + platformLinks.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full z-[100] mt-3 w-72 origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 rounded-xl border border-border/50 bg-background/95 p-5 shadow-xl backdrop-blur-md duration-200"
        >
          {/* 개발자의 사이트 */}
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs">
                🛠️
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                개발자의 사이트
              </h3>
            </div>
            <div className="space-y-1">
              {developerSites.map((site) => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span className="text-sm font-medium text-foreground/90 transition-colors group-hover:text-primary">
                    {site.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="mb-5 border-t border-border/50" />

          {/* 개발자의 플랫폼 */}
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs">
                🧑🏻‍💻
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                itjustbong 플랫폼
              </h3>
            </div>
            <div className="space-y-1">
            {platformLinks.map((site) => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span className="text-sm font-medium text-foreground/90 transition-colors group-hover:text-primary">
                    {site.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="mb-5 border-t border-border/50" />

          {/* 사용자 정보 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs">
                👤
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                소셜 링크
              </h3>
            </div>
            <div className="flex gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 transition-all hover:bg-primary hover:shadow-md"
                  title={link.name}
                >
                  <link.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary-foreground" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
