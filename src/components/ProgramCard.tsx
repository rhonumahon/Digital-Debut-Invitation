/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useDebutProgram } from "../hooks/useDebutProgram";
import Reveal from "./Reveal";

export default function ProgramCard() {
  const { state } = useDebutProgram();
  const programSteps = state.steps;

  return (
    <div className="group relative overflow-hidden p-4 sm:p-8 md:p-12 w-full flex flex-col items-center">
      {/* All transparent/filter overlays have been completely removed from this background */}

      {/* Import elegant scripts dynamically */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
        
        .font-timeline-script {
          font-family: 'Alex Brush', cursive;
        }

        .gold-line-glow {
          box-shadow: 0 0 8px rgba(196, 152, 88, 0.4);
        }

        .timeline-ink {
          text-shadow:
            0 1px 1px rgba(7, 24, 46, 1),
            0 2px 8px rgba(7, 24, 46, 0.95),
            0 0 16px rgba(7, 24, 46, 0.85);
        }

        .timeline-ink-title {
          text-shadow:
            0 2px 2px rgba(7, 24, 46, 1),
            0 4px 18px rgba(7, 24, 46, 0.95),
            0 0 28px rgba(7, 24, 46, 0.8);
        }
      `}</style>

      <div className="relative z-10 w-full flex flex-col items-center py-2">
        
        {/* Top Header Group */}
        <Reveal className="text-center mb-8 select-none" y={16}>
          <span className="text-gold-accent text-xs tracking-widest font-serif block mb-1">✦ &nbsp; ⚜ &nbsp; ✦</span>
          <h2 className="font-timeline-script timeline-ink-title text-6xl md:text-7xl text-white leading-tight">
            Debut Timeline</h2>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold-accent/40 to-transparent mx-auto mt-2" />
        </Reveal>

        {/* Timeline Content Area */}
        <div className="relative w-full max-w-2xl flex flex-col items-center my-2 pb-10">
          
          {/* Central Vertical Spine Line (Always centered on all viewports) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary-rose-light/40 via-primary-rose/30 to-primary-rose-light/40 -translate-x-1/2 z-0" />

          {/* List of Timeline Steps */}
          <div className="w-full space-y-7 md:space-y-9">
            {programSteps.map((step, idx) => {
              const isEven = idx % 2 === 0;
              const label = (
                <>
                  <span className="font-playfair timeline-ink text-base sm:text-lg text-white italic font-bold transition-colors select-none leading-tight block">
                    {step.title}
                  </span>
                  {step.note.trim() && (
                    <span className="font-garamond timeline-ink text-base text-white not-italic font-medium leading-snug block mt-1">
                      {step.note}
                    </span>
                  )}
                </>
              );

              return (
                <Reveal
                  key={step.id}
                  delay={idx * 0.06}
                  y={14}
                  x={isEven ? -22 : 22}
                  className="relative w-full grid grid-cols-2 gap-x-4 sm:gap-x-8 md:gap-x-12 items-center justify-center z-10"
                >
                  {/* Central Node Pin */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#07182e] border-2 border-primary-rose shadow-sm flex items-center justify-center z-20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-rose" />
                  </div>

                  {/* Left Column (Even indexes render here, right-aligned) */}
                  <div className="text-right pr-4 sm:pr-8 md:pr-10 col-start-1">
                    {isEven && label}
                  </div>

                  {/* Right Column (Odd indexes render here, left-aligned) */}
                  <div className="text-left pl-4 sm:pr-8 md:pl-10 col-start-2">
                    {!isEven && label}
                  </div>

                </Reveal>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}