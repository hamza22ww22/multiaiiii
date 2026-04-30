"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeonTextProps {
  children: ReactNode;
  className?: string;
  color?: "cyan" | "purple" | "pink" | "green" | "rainbow";
  intensity?: "low" | "medium" | "high";
  animate?: boolean;
}

const NeonText = ({ 
  children, 
  className, 
  color = "cyan", 
  intensity = "medium",
  animate = true 
}: NeonTextProps) => {
  const colorClasses = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
    green: "text-green-400",
    rainbow: "text-gradient-rainbow",
  };

  const glowClasses = {
    low: {
      cyan: "drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]",
      purple: "drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      pink: "drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      green: "drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
      rainbow: "drop-shadow-[0_0_10px_rgba(255,107,107,0.3)] drop-shadow-[0_0_20px_rgba(255,217,61,0.3)] drop-shadow-[0_0_30px_rgba(107,207,127,0.3)]",
    },
    medium: {
      cyan: "drop-shadow-[0_0_20px_rgba(6,182,212,0.7)]",
      purple: "drop-shadow-[0_0_20px_rgba(168,85,247,0.7)]",
      pink: "drop-shadow-[0_0_20px_rgba(236,72,153,0.7)]",
      green: "drop-shadow-[0_0_20px_rgba(34,197,94,0.7)]",
      rainbow: "drop-shadow-[0_0_20px_rgba(255,107,107,0.5)] drop-shadow-[0_0_40px_rgba(255,217,61,0.5)] drop-shadow-[0_0_60px_rgba(107,207,127,0.5)]",
    },
    high: {
      cyan: "drop-shadow-[0_0_30px_rgba(6,182,212,0.9)] drop-shadow-[0_0_60px_rgba(6,182,212,0.5)]",
      purple: "drop-shadow-[0_0_30px_rgba(168,85,247,0.9)] drop-shadow-[0_0_60px_rgba(168,85,247,0.5)]",
      pink: "drop-shadow-[0_0_30px_rgba(236,72,153,0.9)] drop-shadow-[0_0_60px_rgba(236,72,153,0.5)]",
      green: "drop-shadow-[0_0_30px_rgba(34,197,94,0.9)] drop-shadow-[0_0_60px_rgba(34,197,94,0.5)]",
      rainbow: "drop-shadow-[0_0_30px_rgba(255,107,107,0.7)] drop-shadow-[0_0_60px_rgba(255,217,61,0.7)] drop-shadow-[0_0_90px_rgba(107,207,127,0.7)]",
    },
  };

  const animationClass = animate ? "animate-pulse" : "";

  return (
    <span
      className={cn(
        "font-display font-bold",
        colorClasses[color],
        glowClasses[intensity][color],
        animationClass,
        className
      )}
    >
      {children}
    </span>
  );
};

export default NeonText;