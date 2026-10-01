/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

const PETAL_FILLS = [
  "radial-gradient(ellipse at 35% 30%, #f0c48a, #d4894a 42%, #b87333)",
  "radial-gradient(ellipse at 35% 30%, #f2b56a, #e07a3d 40%, #c45a22)",
  "radial-gradient(ellipse at 35% 30%, #e8c49a, #c9956b 36%, #d4783a)",
];

export default function FloatingPetals() {
  const [petals, setPetals] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    // Initialize 18 lovely floating rose petals drifting gently
    const tempPetals = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage left width
      delay: Math.random() * 8, // animations trigger delay
      duration: 6 + Math.random() * 7, // seconds to fall
      size: 10 + Math.random() * 14, // pixels size
    }));
    setPetals(tempPetals);
  }, []);

  return (
    <>
      {/* Floating Petals Layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20" id="petal-container-react">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="absolute rounded-tr-[120%] rounded-bl-[120%] shadow-sm"
            style={{
              left: `${petal.left}%`,
              width: `${petal.size}px`,
              height: `${petal.size * 0.75}px`,
              top: `-30px`,
              animation: `fall ${petal.duration}s linear infinite`,
              animationDelay: `${petal.delay}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
              background: PETAL_FILLS[petal.id % PETAL_FILLS.length],
            }}
          />
        ))}
      </div>

      {/* Fall Keyframe Definition */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10px) rotate(0deg) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.65;
          }
          90% {
            opacity: 0.65;
          }
          100% {
            transform: translateY(110vh) rotate(360deg) translateX(45px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}