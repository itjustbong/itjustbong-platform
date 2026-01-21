import Link from "next/link";
import { Github, Linkedin, Rss } from "lucide-react";

const SOCIAL_LINKS = [
  { href: "https://github.com/itjustbong", label: "GitHub", icon: Github },
  { href: "https://www.linkedin.com/in/%EC%8A%B9%EC%9A%B0-%EB%B4%89-19108514a/", label: "LinkedIn", icon: Linkedin },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        {/* Copyright */}
        <p className="text-xs text-muted-foreground">
           by itjustbong
        </p>

        {/* Social Links */}
        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={
                link.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="text-muted-foreground/60 transition-colors hover:text-foreground"
              aria-label={link.label}
            >
              <link.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
