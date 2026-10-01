import { motion, useReducedMotion } from "motion/react";
import { useContext } from "react";
import { RevealReady } from "./Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

export default function SectionFlourish() {
  const ready = useContext(RevealReady);
  const reduce = useReducedMotion();
  const still = !ready || reduce;

  return (
    <div className="flex justify-center px-8 pb-8 pointer-events-none" aria-hidden="true">
      <motion.img
        src="/assets/images/section-flourish.png"
        alt=""
        className="w-[min(20rem,78vw)] max-w-sm h-auto select-none"
        initial={still ? false : { opacity: 0, y: 18, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.05, ease }}
      />
    </div>
  );
}
