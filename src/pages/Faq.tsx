"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown, HelpCircle, Zap, Globe, Shield, Code2, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { Tilt } from "@/components/fx/Tilt";
import { Reveal } from "@/components/fx/Reveal";

const FAQItem = ({ question, answer, icon: Icon, delay = 0 }: { 
  question: string; 
  answer: string; 
  icon: any; 
  delay?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Reveal delay={delay}>
      <Tilt max={8} scale={1.02} depth={25} className="rounded-2xl">
        <div 
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-6 hover:border-white/30 transition-all duration-500 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-start justify-between text-left">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] group-hover:bg-white/[0.08] transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">{question}</h3>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          
          <div className={`mt-4 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </div>
          </div>
        </div>
      </Tilt>
    </Reveal>
  );
};

const Faq = () => {
  const faqs = [
    {
      question: "Is this the official GLM 5.1 website?",
      answer: "This is an unofficial community-built interface for GLM 5.1. We provide enhanced features, 3D visualizations, and developer tools while connecting to the same powerful AI backend.",
      icon: Globe,
    },
    {
      question: "How does the streaming work?",
      answer: "We use Server-Sent Events (SSE) for real-time token streaming. Each word appears as it's generated, with sub-100ms latency.",
      icon: Zap,
    },
    {
      question: "Is my API key secure?",
      answer: "Yes! Keys are stored encrypted in Supabase, never logged, and each key is isolated. You can revoke keys anytime.",
      icon: Shield,
    },
    {
      question: "What's the rate limit?",
      answer: "No rate limits for fair use. We trust our community. For commercial applications, contact us for dedicated infrastructure.",
      icon: InfinityIcon,
    },
    {
      question: "Can I use this in production?",
      answer: "Absolutely! The API is production-ready with 99.9% uptime. We recommend implementing retry logic for mission-critical applications.",
      icon: Code2,
    },
    {
      question: "What models are available?",
      answer: "Currently GLM 5.1 (128K context). We're adding GLM 5.1 Turbo and Vision soon. All models support function calling.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background noise">
      <SiteHeader />
      
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />

      <div className="container relative z-10 py-20 md:py-32">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <Reveal className="mb-16 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              [ FAQ ] · Unofficial Community Edition
            </span>
            <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-7xl">
              Frequently Asked
              <span className="block gradient-text">Questions</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
              Everything you need to know about this enhanced GLM 5.1 interface.
            </p>
          </Reveal>

          {/* Disclaimer Banner */}
          <Reveal delay={100}>
            <div className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-amber-200">Unofficial Community Project</h3>
                  <p className="mt-2 text-sm text-amber-300/80">
                    This interface is built by the community, not the official GLM team. 
                    For official support, visit the original GLM website.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* FAQ Grid */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                icon={faq.icon}
                delay={index * 80}
              />
            ))}
          </div>

          {/* CTA */}
          <Reveal delay={400} className="mt-20 text-center">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-10">
              <h3 className="font-display text-3xl font-bold tracking-tight">Still have questions?</h3>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                Join our community of developers building with GLM.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="rounded-full bg-foreground text-background hover:bg-white/90">
                  Join Discord
                </Button>
                <Button size="lg" variant="outline" className="rounded-full border-white/10">
                  Contact Support
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <span className="font-display text-xs font-bold text-background">G</span>
            </div>
            <span className="font-display text-sm font-medium">GLM 5.1 Community Edition</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 · Community Built · Not affiliated with official GLM
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Faq;