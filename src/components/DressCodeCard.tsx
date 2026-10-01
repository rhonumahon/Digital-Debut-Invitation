/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Check } from "lucide-react";
import FadeSlides from "./FadeSlides";
import Reveal from "./Reveal";

interface ColorSwatch {
  hex: string;
  name: string;
}

function isLightSwatch(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (red * 299 + green * 587 + blue * 114) / 1000 > 140;
}

export default function DressCodeCard() {
  const swatches: ColorSwatch[] = [
    { hex: "#C15C2E", name: "Rust" },
    { hex: "#7A4034", name: "Chocolate" },
    { hex: "#E6D4C0", name: "Cream" },
    { hex: "#B68567", name: "Camel" },
  ];

  const slides = [
    {
      src: "/assets/images/autumn-palette.jpg",
      alt: "Autumn palette of rust, chocolate, cream, and camel knits",
    },
    {
      src: "/assets/images/attire.jpg",
      alt: "Semi-formal attire in rust, chocolate, cream, and camel",
    },
  ];

  const [selectedSwatch, setSelectedSwatch] = useState<ColorSwatch>(swatches[0]);
  const [attireRole, setAttireRole] = useState<"ladies" | "lords">("ladies");

  return (
    <Reveal delay={0.28} className="h-full">
    <div className="bronze-card group relative overflow-visible rounded-3xl flex flex-col text-center h-full">
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-3xl">
        <FadeSlides slides={slides} />
      </div>

      <div className="flex flex-1 flex-col justify-between p-8">
        <div>
          <div className="text-center mb-6 select-none mt-2">
            <span className="text-[#a8642c] text-sm tracking-widest font-serif">✦ &nbsp; ⚜ &nbsp; ✦</span>
          </div>

          <h3 className="font-playfair text-2xl text-[#7a3e18] mb-2 italic">Dress Code</h3>
          <p className="font-playfair text-xl text-[#7a3e18] tracking-wider font-semibold mb-4">
            Semi-Formal
          </p>
          <p className="font-garamond text-[18px] text-[#5c3418] leading-relaxed mb-6">
            We kindly request our guests to <strong>dress strictly within the prescribed color palette.</strong>
          </p>

          <span className="font-garamond text-base font-bold uppercase tracking-wide text-[#7a3e18] mb-4 flex items-center justify-center gap-1.5"> Look Good · Feel Good · Celebrate Together </span>

          <div className="flex flex-wrap justify-center gap-3">
            {swatches.map((swatch) => (
              <button
                key={swatch.name}
                type="button"
                onClick={() => setSelectedSwatch(swatch)}
                aria-label={swatch.name}
                aria-pressed={selectedSwatch.name === swatch.name}
                className={`w-10 h-10 rounded-full shadow-md border-2 transition-all relative overflow-hidden cursor-pointer ${
                  selectedSwatch.name === swatch.name 
                    ? "border-primary-rose scale-110 shadow-lg" 
                    : "border-white/90 hover:scale-105"
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              >
                {selectedSwatch.name === swatch.name && (
                  <div className={`absolute inset-0 flex items-center justify-center ${isLightSwatch(swatch.hex) ? "bg-black/10 text-[#07182e]" : "bg-black/15 text-white"}`}>
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div
            className="mt-4 w-full rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: selectedSwatch.hex }}
          >
            <p className={`font-garamond text-base font-bold tracking-wide ${isLightSwatch(selectedSwatch.hex) ? "text-[#07182e]" : "text-white"}`}>
              {selectedSwatch.name}
            </p>
          </div>
        </div>

      <div className="border-t border-[#c4894a]/35 pt-5">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button onClick={() => setAttireRole("ladies")}
            className={`invite-btn ${attireRole === "ladies" ? "on" : ""}`}
          > Ladies </button>
          <button onClick={() => setAttireRole("lords")}
            className={`invite-btn ${attireRole === "lords" ? "on" : ""}`}
          > Gentlemen </button>
        </div>

        <div className="bronze-inset p-4 rounded-xl text-left">
          <p className="text-[16px] font-garamond text-[#5c3418] leading-relaxed">
            {attireRole === "ladies" ? (
              <>
                <strong>Semi-Formal:</strong> elegant dresses, or a refined blouse with a skirt or trousers, in the palette above.
              </>
            ) : (
              <>
                <strong>Semi-Formal:</strong> a polo or long sleeves with slacks, or a suit, in the palette above.
              </>
            )}
            <span className="block mt-2 pt-2 border-t border-[#c4894a]/30 text-center text-base font-semibold text-[#8a4e24] italic">
              Kindly avoid maong pants, ripped jeans, skinny jeans, and slippers.
            </span>
          </p>
        </div>
      </div>
      </div>
    </div>
    </Reveal>
  );
}