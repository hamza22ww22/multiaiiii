import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";

const SiteHeader = () => {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">GLM 5.1</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat
          </Link>
          <Link
            to="/docs"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/docs" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;