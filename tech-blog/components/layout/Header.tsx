import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono text-base transition-opacity hover:opacity-80"
        >
          <span className="mr-1.5">🧑‍💻</span>
          <span className="text-primary">{"<"}</span>
          <span className="font-semibold">log</span>
          <span className="text-muted-foreground">.itjustbong</span>
          <span className="text-primary">{" />"}</span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
