import Link from "next/link";
import { Github, Twitter, Rss } from "lucide-react";

const SOCIAL_LINKS = [
  { href: "https://github.com", label: "GitHub", icon: Github },
  { href: "https://twitter.com", label: "Twitter", icon: Twitter },
  { href: "/rss.xml", label: "RSS", icon: Rss },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        {/* Copyright */}
        <p className="text-xs text-muted-foreground">
          {currentYear} Tech Blog
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
