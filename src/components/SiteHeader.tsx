import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";

const SiteHeader = forwardRef<HTMLElement>((_, ref) => {
  const { pathname } = useLocation();
  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`link-underline px-1 text-sm font-medium tracking-wide transition-colors ${
        pathname === to ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header
      ref={ref}
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/70 backdrop-blur-2xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <span className="font-display text-sm font-bold text-background">G</span>
            <span className="pulse-ring absolute inset-0 rounded-lg" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            GLM<span className="text-muted-foreground">.</span>5.1
          </span>
        </Link>
        <nav className="flex items-center gap-7">
          {navLink("/", "Chat")}
          {navLink("/docs", "API")}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="link-underline text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Live
            </span>
          </span>
        </div>
      </div>
    </header>
  );
});
SiteHeader.displayName = "SiteHeader";

export default SiteHeader;
