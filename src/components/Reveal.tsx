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

  if (reduce) return <div className={className}>{children}</div>;

  /* Keep one motion wrapper so children (e.g. <video>) are not remounted when `ready` flips after the envelope. */
  return (
    <motion.div
      className={className}
      initial={ready ? { opacity: 0, y, x } : false}
      animate={ready ? undefined : { opacity: 1, y: 0, x: 0 }}
      whileInView={ready ? { opacity: 1, y: 0, x: 0 } : undefined}
      viewport={ready ? { once: true, amount: 0.18 } : undefined}
      transition={ready ? { duration: 0.9, ease, delay } : undefined}
    >
      {children}
    </motion.div>
  );
}
