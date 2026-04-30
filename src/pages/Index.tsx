"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Code2, MessageSquare, Globe, Zap, Shield,
  Sparkles, Rocket, Brain, Cpu, Infinity as InfinityIcon,
  ArrowUpRight
} from "lucide-react";
import { Tilt } from "@/components/fx/Tilt";
import { Reveal } from "@/components/fx/Reveal";
import { Hero3D } from "@/components/fx/Hero3D";
import { ParticleField } from "@/components/fx/ParticleField";
import InteractiveGrid from "@/components/fx/InteractiveGrid";
import { OrbitalSystem } from "@/components/fx/OrbitalSystem";

const GRID_SVG_URL = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";

const Index = () => {
  const [view, setView] = useState<"chat" | "iframe">("chat");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const r = heroRef.current.getBoundingClientRect();
      setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    };

    const onScroll = () => setScrollY(window.scrollY);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const parallaxStyle: CSSProperties = {
    transform: `translateY(${scrollY * 0.5}px)`,
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background noise">
      <SiteHeader />

      {/* HERO SECTION */}
      <section ref={heroRef} className="relative h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
        <ParticleField />
        <div className="absolute inset-0 opacity-20"><InteractiveGrid /></div>
        <div className="absolute inset-0"><OrbitalSystem /></div>
        <Hero3D />
        
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{ background: `radial-gradient(800px circle at ${mouse.x}% ${mouse.y}%, rgba(255,255,255,0.1), transparent 50%)` }}
        />

        <div 
          className="float pointer-events-none absolute left-[8%] top-32 h-72 w-72 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-3xl"
          style={parallaxStyle}
        />

        <div className="container relative h-full flex items-center">
          <div className="mx-auto max-w-6xl text-center">
            <Reveal className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-6 py-2.5 backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.3em]">
                  Unofficial Community Edition · v5.1 · Live
                </span>
              </div>
            </Reveal>

            <h1 className="reveal-up font-display text-6xl font-bold leading-[0.9] tracking-tight md:text-8xl lg:text-9xl">
              <span className="block bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                The Future
              </span>
              <span className="block mt-4 text-stroke">
                of AI is <span className="text-white">Here</span>
              </span>
            </h1>

            <p className="reveal-up mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
              <span className="shimmer inline-block bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                Experience GLM 5.1 like never before. 3D visuals, real-time streaming, 
                and developer tools in one stunning interface.
              </span>
            </p>

            <div className="reveal-up mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link to="/docs">
                <Button size="lg" className="group relative h-14 overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-8 text-lg font-semibold text-white shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40">
                  <span className="relative z-10 flex items-center">
                    <Rocket className="mr-3 h-5 w-5" />
                    Launch Now
                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-2" />
                  </span>
                </Button>
              </Link>
              
              <Link to="/faq">
                <Button size="lg" variant="outline" className="h-14 rounded-full border-2 border-white/20 bg-white/[0.05] px-8 backdrop-blur-xl hover:border-white/40 hover:bg-white/[0.1]">
                  <Brain className="mr-3 h-5 w-5" />
                  Learn More
                </Button>
              </Link>
            </div>

            <Reveal delay={400} className="mt-20">
              <Tilt max={8} scale={1.02} depth={30} className="rounded-3xl">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] md:grid-cols-4">
                  {[
                    { v: "∞", l: "Unlimited Tokens", icon: InfinityIcon },
                    { v: "<50ms", l: "Response Time", icon: Zap },
                    { v: "99.9%", l: "Uptime SLA", icon: Shield },
                    { v: "128K", l: "Context Window", icon: Cpu },
                  ].map((s, i) => (
                    <div key={i} className="relative bg-background/80 p-8 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
                      <div className="relative">
                        <s.icon className="mb-4 h-8 w-8 text-cyan-400" />
                        <div className="font-display text-4xl font-bold md:text-5xl">{s.v}</div>
                        <div className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
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
      <section className="relative border-y border-white/5 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 py-8">
        <div className="flex overflow-hidden">
          <div className="marquee flex shrink-0 items-center gap-12 px-6 font-display text-2xl font-medium">
            {["⚡ REAL-TIME STREAMING", "✦", "🎯 3D VISUALIZATION", "✦", "🚀 EDGE DEPLOYED", "✦", "🔐 ZERO LOGIN", "✦", "🌐 GLOBAL CDN", "✦", "💫 UNLIMITED API", "✦"].map((t, i) => (
              <span key={i} className="whitespace-nowrap bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CHAT SECTION */}
      <section className="container py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 flex flex-col items-center gap-6 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400">[ 01 ] · Live Demo</span>
            <h2 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
              Talk to <span className="gradient-text">GLM 5.1</span>
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Experience the power of real-time AI conversations with our enhanced 3D interface.
            </p>
          </Reveal>

          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl">
              {[
                { id: "chat", icon: MessageSquare, label: "3D Chat" },
                { id: "iframe", icon: Globe, label: "Original Site" },
              ].map((o) => {
                const Icon = o.icon;
                const active = view === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setView(o.id as typeof view)}
                    className={`relative flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 ${active ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white" : "text-muted-foreground hover:text-white"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {o.label}
                    {active && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Reveal delay={150}>
            <Tilt max={6} scale={1.01} depth={20} glare={true} className="rounded-3xl">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] shadow-2xl shadow-cyan-500/10">
                {view === "chat" ? (
                  <ChatBox />
                ) : (
                  <div className="relative">
                    <iframe src="https://glmfivepointone.space-z.ai/" title="GLM 5.1" className="h-[600px] w-full bg-card" />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/50 to-transparent" />
                    <p className="border-t border-white/10 bg-card px-4 py-3 text-center text-sm text-muted-foreground">
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        Unofficial Enhanced Interface · Same AI Backend
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col items-center gap-6 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">[ 02 ] · Features</span>
            <h2 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
              Built for the <span className="text-stroke">Future</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Zap, title: "Lightning Fast", desc: "Sub-50ms response times with real-time streaming.", gradient: "from-cyan-500 to-blue-500" },
              { Icon: Brain, title: "Advanced AI", desc: "GLM 5.1 with 128K context window.", gradient: "from-purple-500 to-pink-500" },
              { Icon: Globe, title: "Global Edge", desc: "Deployed across 50+ edge locations.", gradient: "from-green-500 to-emerald-500" },
              { Icon: Shield, title: "Enterprise Security", desc: "End-to-end encryption.", gradient: "from-amber-500 to-orange-500" },
              { Icon: Code2, title: "Developer First", desc: "Comprehensive API and SDKs.", gradient: "from-red-500 to-rose-500" },
              { Icon: Rocket, title: "Always Evolving", desc: "Weekly updates and improvements.", gradient: "from-indigo-500 to-violet-500" },
            ].map(({ Icon, title, desc, gradient }, i) => (
              <Reveal key={i} delay={i * 80}>
                <Tilt max={12} scale={1.03} depth={40} className="h-full rounded-3xl">
                  <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-8 transition-all duration-500 hover:border-white/30">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-10`} />
                    <div className="relative mb-6">
                      <div className={`relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} p-3`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="relative mb-3 font-display text-2xl font-semibold">{title}</h3>
                    <p className="relative text-sm leading-relaxed text-muted-foreground">{desc}</p>
                    <ArrowUpRight className="absolute right-6 top-6 h-5 w-5 text-white/20 transition-all group-hover:text-white/60" />
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CODE SECTION */}
      <section className="container py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-2">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400">[ 03 ] · Developer</span>
            <h2 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-6xl">
              Code in <span className="gradient-text">3D</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Our API is designed for developers who demand the best.
            </p>
            
            <div className="mt-8 space-y-4">
              {["TypeScript/JavaScript SDK", "Python, Go, Rust packages", "WebSocket & SSE support", "Automatic retry logic"].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/docs">
                <Button size="lg" className="group rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-8">
                  View Documentation
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <Tilt max={10} scale={1.02} depth={35} className="rounded-3xl">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01]">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url('${GRID_SVG_URL}')` }} />
                
                <div className="relative border-b border-white/10 bg-white/[0.02] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="ml-3 font-mono text-xs text-muted-foreground">chat-api.js</span>
                  </div>
                </div>
                
                <pre className="overflow-x-auto p-8 font-mono text-sm leading-relaxed">
{`import { GLMClient } from '@glm/sdk';

const client = new GLMClient({
  apiKey: 'glm_••••••••',
  streaming: true,
});

const stream = await client.chat({
  messages: [
    { role: 'user', content: 'Hi!' }
  ],
  model: 'glm-5.1',
});

// Stream tokens 🚀
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}`}<span className="blink ml-1 inline-block h-4 w-2 bg-cyan-400" />
                </pre>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32">
        <div className="absolute inset-0"><ParticleField /></div>
        
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-white">Ready to Build?</span>
              <h2 className="mt-6 font-display text-6xl font-bold tracking-tight md:text-7xl">
                Start <span className="gradient-text">Building</span> Today
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                Join thousands of developers building with GLM 5.1. No credit card required.
              </p>
            </Reveal>
            
            <Reveal delay={200} className="mt-10">
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/docs">
                  <Button size="lg" className="group relative h-16 overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 px-10 text-lg font-semibold text-white shadow-2xl shadow-cyan-500/30">
                    <span className="relative z-10 flex items-center">
                      <Rocket className="mr-3 h-6 w-6" />
                      Get Started Free
                      <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-2" />
                    </span>
                  </Button>
                </Link>
                
                <Link to="/faq">
                  <Button size="lg" variant="outline" className="h-16 rounded-full border-2 border-white/30 bg-white/[0.08] px-10 text-lg backdrop-blur-xl">
                    <Brain className="mr-3 h-5 w-5" />
                    Learn More
                  </Button>
                </Link>
              </div>
            </Reveal>
            
            <Reveal delay={400} className="mt-12">
              <div className="inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.05] px-8 py-4 backdrop-blur-xl">
                {[
                  { value: "10K+", label: "Developers" },
                  { value: "99.9%", label: "Uptime" },
                  { value: "50ms", label: "Avg Latency" },
                  { value: "∞", label: "Free Tier" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="font-display text-2xl font-bold">{stat.value}</div>
                    <div className="font-mono text-xs uppercase tracking-widest text-white/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-gradient-to-b from-black to-gray-900">
        <div className="container py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500">
                <span className="font-display text-lg font-bold text-white">G</span>
                <span className="pulse-ring absolute inset-0 rounded-xl" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold">GLM 5.1</span>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Unofficial Community Edition</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              <a href="#" className="link-underline text-sm text-muted-foreground hover:text-white">Documentation</a>
              <a href="#" className="link-underline text-sm text-muted-foreground hover:text-white">API Reference</a>
              <Link to="/faq" className="link-underline text-sm text-muted-foreground hover:text-white">FAQ</Link>
              <a href="#" className="link-underline text-sm text-muted-foreground hover:text-white">Discord</a>
            </div>
            
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              © 2026 · Community Built · Not affiliated with official GLM
            </p>
          </div>
          
          <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-amber-300/80">
              ⚠️ This is an unofficial community-built interface. For official GLM 5.1 support, 
              please visit the original website.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;