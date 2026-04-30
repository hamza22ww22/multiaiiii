import { ReactNode, CSSProperties } from "react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: keyof JSX.IntrinsicElements;
};

export const Reveal = ({ children, className, delay = 0, y = 30, as: As = "div" }: Props) => {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const style: CSSProperties = {
    transform: shown ? "translateY(0)" : `translateY(${y}px)`,
    opacity: shown ? 1 : 0,
    transition: `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    willChange: "transform, opacity",
  };
  // @ts-ignore
  return <As ref={ref} style={style} className={className}>{children}</As>;
};
