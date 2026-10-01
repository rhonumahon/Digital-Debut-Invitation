import { createContext, useContext, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export const RevealReady = createContext(false);

export function RevealReadyProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  return <RevealReady.Provider value={ready}>{children}</RevealReady.Provider>;
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  x = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}) {
  const ready = useContext(RevealReady);
  const reduce = useReducedMotion();

  if (!ready || reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
