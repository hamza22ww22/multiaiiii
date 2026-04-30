"use client";

import { useState, useRef } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown, HelpCircle, Zap, Globe, Shield, Code2, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { Tilt } from "@/components/fx/Tilt";
import { Reveal } from "@/components/fx/Reveal";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

// 3D FAQ Icon Component
function FAQIcon3D() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Center>
        <mesh ref={meshRef}>
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
            wireframe
          />
        </mesh>
        <mesh position={[0, 0, 1.5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      </Center>
    </Float>
  );
}

const FAQItem = ({ question, answer, icon: Icon, delay = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Reveal delay={delay}>
      <Tilt max={8} scale={1.02} depth={25} className="rounded-2xl">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-6 hover:border-white/30 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-start justify-between text-left"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] group-hover:bg-white/[0.08] transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">{question}</h3>
                <p className={`mt-2 text-sm leading-relaxed text-muted-foreground transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-0'}`}>
                  {answer}
                </p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
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
      answer: "We use Server-Sent Events (SSE) for real-time token streaming. Each word appears as it's generated, with sub-100ms latency. The connection stays open until the response completes.",
      icon: Zap,
    },
    {
      question: "Is my API key secure?",
      answer: "Yes! Keys are stored encrypted in Supabase, never logged, and each key is isolated. You can revoke keys anytime. We never store your conversation data.",
      icon: Shield,
    },
    {
      question: "What's the rate limit?",
      answer: "No rate limits for fair use. We trust our community. For commercial applications generating over 10M tokens/day, please contact us for dedicated infrastructure.",
      icon: InfinityIcon,
    },
    {
      question: "Can I use this in production?",
      answer: "Absolutely! The API is production-ready with 99.9% uptime. We recommend implementing retry logic and caching for mission-critical applications.",
      icon: Code2,
    },
    {
      question: "How does the 3D visualization work?",
      answer: "We use Three.js with @react-three/fiber for real-time WebGL rendering. The particles, floating objects, and interactive elements are rendered at 60fps using your GPU.",
      icon: Sparkles,
    },
    {
      question: "What models are available?",
      answer: "Currently GLM 5.1 (128K context). We're adding GLM 5.1 Turbo (faster) and GLM 5.1 Vision (multimodal) soon. All models support function calling and JSON mode.",
      icon: HelpCircle,
    },
    {
      question: "How do I handle errors?",
      answer: "The API returns standard HTTP status codes with descriptive JSON errors. We recommend exponential backoff for 429/5xx errors. All responses include request IDs for debugging.",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background noise">
      <SiteHeader />
      
      {/* Animated background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />

      {/* 3D Canvas */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <FAQIcon3D />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

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
              Can't find your answer? Join our Discord community.
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
                    We provide enhanced features and visualizations while connecting to the same AI backend.
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
          <Reveal delay={600} className="mt-20 text-center">
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
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              · Unofficial · Enhanced
            </span>
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