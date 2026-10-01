/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ROLE_LABEL, ROLES, slotsFor, type TraditionRole } from "../attendance/types";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

const headingEase = [0.25, 0.1, 0.25, 1] as const;

const PARCHMENT_IMAGE = "/assets/images/paper.png?v=2";
const FLOWER_IMAGE = "/assets/images/top_flower.png?v=3";

const NOTES: Partial<Record<TraditionRole, string>> = {
  fashion: "A dress or a top",
  glam: "Cosmetics or a scent",
};

function padNames(names: string[], count: number): string[] {
  return [...names, ...Array(Math.max(0, count - names.length)).fill("")].slice(0, count);
}

function SymbolsHeading() {
  return (
    <>
      <span className="font-cinzel text-sm tracking-[0.2em] uppercase text-white block mb-2 drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
        Traditions of the Evening
      </span>
      <h2 className="font-playfair text-[42px] md:text-6xl text-white italic font-medium leading-tight drop-shadow-[0_2px_12px_rgba(7,24,46,0.4)]">
        18 Symbols of a Debut
      </h2>
    </>
  );
}

export default function SymbolsSection() {
  const [roster, setRoster] = useState<Record<TraditionRole, string[]> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/roster")
      .then((response) => response.json())
      .then((body: Record<TraditionRole, string[]>) => setRoster(body))
      .catch(() => setRoster({ roses: [], fashion: [], bills: [], treasures: [], glam: [], wishes: [] }));
  }, []);

  return (
    <section className="pt-8 pb-24 px-6 md:px-12 relative overflow-hidden" id="symbols">
      <SectionFlourish />
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <div className="absolute top-1/4 left-1/12 w-96 h-96 bg-primary-rose-light/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/3 right-1/12 w-96 h-96 bg-gold-light/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {reduceMotion ? (
          <div className="text-center mb-16 select-none font-garamond">
            <SymbolsHeading />
          </div>
        ) : (
          <motion.div
            className="text-center mb-16 select-none font-garamond"
            initial={{ opacity: 0, y: -26, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.25, ease: headingEase }}
          >
            <SymbolsHeading />
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-6">
          {ROLES.map((role, index) => (
            <Reveal
              key={role}
              delay={index * 0.08}
              className={`group relative rounded-none flex flex-col justify-stretch overflow-visible ${slotsFor(role) === 18 ? "min-h-[560px]" : "min-h-[320px]"}`}
            >
              <div
                className={`relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 ${slotsFor(role) === 18 ? "min-h-[560px]" : "min-h-[320px]"}`}
                style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
              >
                <img src={FLOWER_IMAGE} alt="" className="absolute -top-10 -left-8 w-28 h-auto object-contain z-20 pointer-events-none select-none drop-shadow-md" />
                <img src={FLOWER_IMAGE} alt="" className="absolute -bottom-10 -right-8 w-28 h-auto object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />
                <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />
                <div className="relative z-10 text-center flex flex-col items-center w-full">
                  <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                    {ROLE_LABEL[role]}
                  </h3>
                  {NOTES[role] && (
                    <p className="text-base font-garamond text-amber-900 font-semibold mb-2">{NOTES[role]}</p>
                  )}
                  <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                    {padNames(roster?.[role] ?? [], slotsFor(role)).map((name, index) => (
                      <p key={index} className="py-[1.5px] border-b border-amber-900/10 font-garamond italic text-[20px] text-amber-950 text-center font-semibold leading-tight">
                        {name || <span className="opacity-30">..........................................</span>}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
