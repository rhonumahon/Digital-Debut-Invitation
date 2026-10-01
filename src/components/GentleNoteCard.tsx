import { StrikethroughIcon } from "lucide-react";
import React from "react";

export default function GentleNoteCard() {
  return (
    <div className="bronze-card group relative overflow-visible rounded-3xl p-8 flex flex-col justify-between text-center transition-all hover:-translate-y-2 duration-300 h-full">

      <div className="relative z-10 py-2">
        {/* Elegant top floral-style star grouping */}
        <div className="text-center mb-4 select-none">
          <span className="text-[#a8642c] text-sm tracking-widest font-serif">✦ &nbsp; ⚜ &nbsp; ✦</span>
        </div>

        <span className="text-[#a8642c] font-garamond text-sm tracking-[0.18em] uppercase block mb-1 font-bold">
          Court Etiquette & Guide
        </span>
        
        <h3 className="font-garamond text-2xl text-[#7a3e18] mb-3 italic font-semibold">
          A Gentle Note for Our Guests
        </h3>
        
        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#c4894a]/70 to-transparent mx-auto mb-6" />

        <div className="space-y-4 text-left text-xl text-[#5c3418] leading-relaxed px-1 font-garamond italic font-light">
          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            Please confirm your attendance on or before November 2, 2026 with Lyn Briones at 0916 522 6110.
          </p>

          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            Please avoid arriving late, especially those who are part of the 18 traditions.
          </p>
          
          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            Guests are graciously requested to arrive at 5:00 PM
          </p>
          
          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            This celebration is prepared with care for our invited guests only. We are unable to accommodate additional guests or +1s.
          </p>
          
          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            We kindly request guests to adhere to the prescribed dress code and arrive on time to honor the program.
          </p>

          <p className="border-b border-[#c4894a]/25 pb-3 text-center">
            Your presence is truly appreciated. If you wish to give a gift, let it be something that carries a reminder of the debutant, Jaylyn Eirielle, in your thoughts and comes from the heart.
          </p>
          
          <p className="pt-2 text-center text-[#7a3e18] tracking-wide font-playfair italic text-2xl font-normal">
            We look forward to celebrating this special day with you!
          </p>
        </div>
      </div>
    </div>
  );
}