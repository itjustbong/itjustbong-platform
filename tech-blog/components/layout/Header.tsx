import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { InfoPopup } from "./InfoPopup";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono text-base transition-opacity hover:opacity-80"
        >
          <Image
            src="/icon/icon-192.png"
            alt="logo"
            width={20}
            height={20}
            className="mr-1.5 inline-block"
          />
          <span className="text-primary">{"<"}</span>
          <span className="font-semibold">log</span>
          <span className="text-muted-foreground">.itjustbong</span>
          <span className="text-primary">{" />"}</span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <InfoPopup />
        </div>
      </div>
    </header>
  );
}
