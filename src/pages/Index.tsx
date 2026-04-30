import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Code2, MessageSquare, Globe, Zap, Shield,
  Sparkles, Terminal, Cpu, Infinity as InfinityIcon, ArrowUpRight
} from "lucide-react";
import { Tilt } from "@/components/fx/Tilt";
import { Reveal } from "@/components/fx/Reveal";
import { Hero3D } from "@/components/fx/Hero3D";

const Index = () => {
  const [view, setView] = useState<"chat" | "iframe">("chat");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const r = heroRef.current.getBoundingClientRect();
      setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background noise">
      <SiteHeader />

      {/* HERO */}
      <section ref={heroRef} className="relative">
        {/* Animated grid */}
        <div className="absolute inset-0 grid-bg" />
        {/* 3D backdrop */}
        <Hero3D />
        {/* Spotlight follows cursor */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, hsl(0 0% 100% / 0.06), transparent 40%)`,
          }}
        />
        {/* Floating orbs */}
        <div className="float pointer-events-none absolute left-[8%] top-32 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="float-slow pointer-events-none absolute right-[10%] top-60 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="container relative pb-20 pt-24 md:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="reveal-up mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs backdrop-blur-xl">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                v5.1 · Live · Streaming
              </span>
            </div>

            <h1
              className="reveal-up font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block gradient-text">The fastest way</span>
              <span className="block">
                to talk to <span className="text-stroke">GLM</span>
              </span>
            </h1>

            <p
              className="reveal-up mx-auto mt-7 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{ animationDelay: "0.2s" }}
            >
              A blazing-fast chatbot interface and a developer API.
              No login. No limits. No nonsense. Generate a key in seconds and stream
              GLM into your own apps.
            </p>

            <div
              className="reveal-up mt-10 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: "0.3s" }}
            >
              <Link to="/docs">
                <Button
                  size="lg"
                  className="group h-12 rounded-full bg-foreground px-7 text-background hover:bg-white/90"
                >
                  Get API Key
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <button
                onClick={() => document.getElementById("chat-area")?.scrollIntoView({ behavior: "smooth" })}
                className="link-underline h-12 rounded-full border border-white/10 bg-white/[0.03] px-7 text-sm font-medium backdrop-blur-xl transition-colors hover:bg-white/[0.06]"
              >
                Try it now ↓
              </button>
            </div>

            {/* Stats strip with 3D tilt */}
            <Reveal delay={400} className="mt-16">
              <Tilt max={6} scale={1.01} depth={20} className="rounded-2xl">
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {[
                    { v: "<1s", l: "Time to first token" },
                    { v: "∞", l: "Messages per day" },
                    { v: "24/7", l: "Uptime" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background px-4 py-6">
                      <div className="font-display text-3xl font-bold md:text-4xl">{s.v}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative border-y border-white/5 bg-white/[0.02] py-6">
        <div className="flex overflow-hidden">
          <div className="marquee flex shrink-0 items-center gap-12 px-6 font-display text-2xl font-medium text-muted-foreground md:text-3xl">
            {[
              "STREAMING", "★", "ZERO LOGIN", "★", "PUBLIC API", "★", "UNLIMITED",
              "★", "OPEN ENDPOINT", "★", "MILLISECOND TTFB", "★",
              "STREAMING", "★", "ZERO LOGIN", "★", "PUBLIC API", "★", "UNLIMITED",
              "★", "OPEN ENDPOINT", "★", "MILLISECOND TTFB", "★",
            ].map((t, i) => (
              <span key={i} className="whitespace-nowrap">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CHAT AREA */}
      <section id="chat-area" className="container py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 flex flex-col items-center gap-4 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              [ 01 ] · Live Demo
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Talk now.
            </h2>
            <p className="max-w-xl text-muted-foreground">
              No signup wall. Use the native streaming UI or open the original site in an iframe.
            </p>
          </Reveal>

          {/* Toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl">
              {[
                { id: "chat", icon: MessageSquare, label: "Native chat" },
                { id: "iframe", icon: Globe, label: "Original site" },
              ].map((o) => {
                const Icon = o.icon;
                const active = view === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setView(o.id as any)}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Reveal delay={150}>
            <Tilt max={4} scale={1.005} depth={10} glare={false} className="rounded-3xl">
              <div className="glow-ring overflow-hidden rounded-3xl border border-white/10 bg-card">
                {view === "chat" ? (
                  <ChatBox />
                ) : (
                  <div>
                    <iframe
                      src="https://glmfivepointone.space-z.ai/"
                      title="GLM 5.1"
                      className="h-[600px] w-full bg-card"
                    />
                    <p className="border-t border-white/10 bg-card px-4 py-2 text-center text-xs text-muted-foreground">
                      If embedding is blocked, switch to Native chat — same backend.
                    </p>
                  </div>
                )}
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 flex flex-col items-center gap-4 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              [ 02 ] · Built for speed
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Everything you need.
              <br />
              <span className="text-stroke">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { Icon: Zap, title: "Streaming first", desc: "Server-Sent Events deliver tokens the moment they're generated." },
              { Icon: InfinityIcon, title: "Unlimited messages", desc: "No quotas. No throttling. No login required." },
              { Icon: Code2, title: "REST in 1 line", desc: "One POST. JSON in, JSON or stream out." },
              { Icon: Shield, title: "Key-based auth", desc: "Generate, copy, ship. Each key isolated and revocable." },
              { Icon: Cpu, title: "Edge deployed", desc: "Serverless edge functions running 24/7 worldwide." },
              { Icon: Terminal, title: "Multi-turn memory", desc: "Pass the messages array — full conversation context preserved." },
            ].map(({ Icon, title, desc }, i) => (
              <Reveal key={i} delay={i * 80}>
                <Tilt max={14} scale={1.03} depth={40} className="h-full rounded-2xl">
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-card p-8">
                    <div
                      className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-colors group-hover:border-white/30 group-hover:bg-white/10"
                      style={{ transform: "translateZ(40px)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3
                      className="mb-2 font-display text-lg font-semibold tracking-tight"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed text-muted-foreground"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      {desc}
                    </p>
                    <ArrowUpRight
                      className="absolute right-6 top-6 h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-foreground"
                      style={{ transform: "translateZ(50px)" }}
                    />
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CODE PREVIEW */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <Reveal>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              [ 03 ] · Developer first
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
              One endpoint.<br />Infinite possibilities.
            </h2>
            <p className="mt-5 text-muted-foreground">
              No SDK to install. No tokens to refresh. Just one HTTP call to a public endpoint
              that streams GLM 5.1 responses straight into your application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/docs">
                <Button size="lg" className="group rounded-full bg-foreground text-background hover:bg-white/90">
                  Read the docs
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <ul className="mt-10 space-y-3 text-sm">
              {["No API key rotation", "CORS open from any origin", "JSON or SSE response", "Free forever for fair use"].map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20">
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150}>
            <Tilt max={10} scale={1.02} depth={35} className="rounded-2xl">
              <div className="glow-ring overflow-hidden rounded-2xl border border-white/10 bg-card">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              </div>
              <span className="ml-2 font-mono text-xs text-muted-foreground">terminal — chat.sh</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed">
{`$ curl -N https://api.glm5point1.app/chat \\
    -H "x-api-key: glm_••••••••" \\
    -d '{"message":"Write a haiku"}'

`}<span className="text-muted-foreground">{`# streaming response →`}</span>{`
data: {"content":"Silent code at dawn,"}
data: {"content":"\\nGLM whispers in the cloud—"}
data: {"content":"\\nTokens bloom like stars."}
data: [DONE]`}<span className="blink" />
            </pre>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 md:py-32">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] px-8 py-20 text-center">
          <div className="grid-bg absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
              Ready to <span className="gradient-text">build?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-muted-foreground">
              Generate your key in 5 seconds. Free, public, instant.
            </p>
            <Link to="/docs" className="mt-10 inline-block">
              <Button
                size="lg"
                className="group h-14 rounded-full bg-foreground px-8 text-base text-background hover:bg-white/90"
              >
                Generate API Key
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <span className="font-display text-xs font-bold text-background">G</span>
            </div>
            <span className="font-display text-sm font-medium">GLM 5.1</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              · Always on
            </span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 · Made for builders
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
