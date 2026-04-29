import { useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, MessageSquare, Globe } from "lucide-react";

const Index = () => {
  const [view, setView] = useState<"chat" | "iframe">("chat");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Powered by GLM 5.1 · Unlimited & free
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Talk to <span className="gradient-text">GLM 5.1</span>
            <br />without limits.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            A blazing-fast chatbot interface and a developer API — no login, no credit card.
            Generate a key in seconds and integrate GLM into your own apps.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/docs">
              <Button size="lg" className="glow">
                Get API Key <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="secondary" onClick={() => setView(view === "chat" ? "iframe" : "chat")}>
              {view === "chat" ? "Open original site" : "Use clean chat UI"}
            </Button>
          </div>
        </div>
      </section>

      {/* View switcher */}
      <section className="container pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setView("chat")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === "chat" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" /> Native chat
            </button>
            <button
              onClick={() => setView("iframe")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === "iframe" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-4 w-4" /> Original site
            </button>
          </div>

          {view === "chat" ? (
            <ChatBox />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border shadow-elegant">
              <iframe
                src="https://glmfivepointone.space-z.ai/"
                title="GLM 5.1"
                className="h-[600px] w-full bg-card"
              />
              <p className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
                If the embedded site does not appear, the original site may block embedding.
                Use the native chat above — it talks to the same backend.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {[
            { icon: MessageSquare, title: "Unlimited chat", desc: "No login, no message caps." },
            { icon: Code2, title: "Simple REST API", desc: "One POST endpoint, JSON in, JSON out." },
            { icon: Globe, title: "24/7 backend", desc: "Always-on serverless infrastructure." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
