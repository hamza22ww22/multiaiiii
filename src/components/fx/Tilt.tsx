import { ReactNode } from "react";
import { useTilt } from "@/hooks/use-tilt";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
  depth?: number; // children get translateZ for parallax depth
};

export const Tilt = ({ children, className, max = 10, scale = 1.02, glare = true, depth = 30 }: Props) => {
  const ref = useTilt<HTMLDivElement>({ max, scale, glare });
  return (
    <div ref={ref} className={cn("relative", className)} style={{ transformStyle: "preserve-3d" }}>
      <div style={{ transform: `translateZ(${depth}px)`, transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
};
