import Link from "next/link";
import { Star, Github } from "lucide-react";
import { Logo } from "./Logo";
import { GITHUB_URL } from "@/config/candleflow";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl bg-[#0b0b12]/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="/#live-demo" className="hover:text-fg transition">Live Demo</a>
          <a href="/#cli"       className="hover:text-fg transition">CLI</a>
          <Link href="/docs"    className="hover:text-fg transition">Docs</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-fg transition">GitHub</a>
        </nav>
        <a
          href={GITHUB_URL}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium hover:bg-white/10 transition"
        >
          <Star className="h-3.5 w-3.5" />
          Star <span className="text-muted">1.2k</span>
          <Github className="ml-1 h-3.5 w-3.5 opacity-60" />
        </a>
      </div>
    </header>
  );
}