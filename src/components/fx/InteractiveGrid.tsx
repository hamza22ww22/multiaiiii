"use client";

import { useRef, useEffect, useState } from "react";

const InteractiveGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };

    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
    }> = [];

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      const gridSize = 40 * window.devicePixelRatio;
      const lineWidth = 1 * window.devicePixelRatio;
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = lineWidth;

      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw mouse effect
      if (isHovering) {
        const centerX = mouse.x * canvas.width;
        const centerY = mouse.y * canvas.height;
        const radius = 100 * window.devicePixelRatio;

        // Radial gradient
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Generate particles on hover
        if (Math.random() < 0.3) {
          particles.push({
            x: centerX,
            y: centerY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            maxLife: 60 + Math.random() * 60,
            size: 1 + Math.random() * 3,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`,
          });
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;
        
        // Apply friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Draw particle
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();

        // Remove dead particles
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1;

      // Draw connection lines between nearby particles
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 0.5 * window.devicePixelRatio;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100 * window.devicePixelRatio) {
            ctx.globalAlpha = (p1.life + p2.life) / 2 * (1 - distance / (100 * window.devicePixelRatio));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [mouse, isHovering]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
      />
      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{
            animation: "scan 3s linear infinite",
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      </div>
    </div>
  );
};

export default InteractiveGrid;