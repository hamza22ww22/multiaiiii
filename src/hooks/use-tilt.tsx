import { useRef, useEffect } from "react";

type Opts = { max?: number; scale?: number; perspective?: number; speed?: number; glare?: boolean };

export function useTilt<T extends HTMLElement>(opts: Opts = {}) {
  const { max = 12, scale = 1.02, perspective = 1000, speed = 400, glare = true } = opts;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let glareEl: HTMLDivElement | null = null;

    if (glare) {
      glareEl = document.createElement("div");
      glareEl.style.cssText = `
        position:absolute;inset:0;border-radius:inherit;pointer-events:none;
        background:radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 50%);
        opacity:0;transition:opacity ${speed}ms ease;mix-blend-mode:overlay;
      `;
      const cs = getComputedStyle(el);
      if (cs.position === "static") el.style.position = "relative";
      if (cs.overflow === "visible") el.style.overflow = "hidden";
      el.appendChild(glareEl);
    }

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -2 * max;
        const ry = (px - 0.5) * 2 * max;
        el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(${scale},${scale},${scale})`;
        if (glareEl) {
          glareEl.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.22), transparent 50%)`;
          glareEl.style.opacity = "1";
        }
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = `perspective(${perspective}px) rotateX(0) rotateY(0) scale3d(1,1,1)`;
      if (glareEl) glareEl.style.opacity = "0";
    };
    const onEnter = () => {
      el.style.transition = `transform ${speed}ms cubic-bezier(0.22,1,0.36,1)`;
      setTimeout(() => { if (el) el.style.transition = "transform 100ms ease-out"; }, speed);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mouseenter", onEnter);
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mouseenter", onEnter);
      glareEl?.remove();
    };
  }, [max, scale, perspective, speed, glare]);

  return ref;
}
