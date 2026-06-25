/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

// Paths to your assets
const BRIDGERTON_BACKGROUND = "/assets/images/flwr.png";
const PARCHMENT_IMAGE = "/assets/images/paper.png"; 
const FLOWER_IMAGE = "/assets/images/flower.png"; 

export default function SymbolsSection() {
  
  const INITIAL_COTILLION = [
    "Trisha Jia Ruado", "Ashton Abaya",      // Couple 1
    "Aareca Legaspi", "Miggy Fadul",        // Couple 2
    "Amanda Cortez", "Andrei Alcober",      // Couple 3
    "Nikkie Dullate", "Rafael Reynes",      // Couple 4
    "Elisse Mangubat", "Sean Prado",        // Couple 5
    "", "", "", "", "" // Padded up to 15 elements
  ];

  const INITIAL_TREASURES = [
    "Anne Bustamante", "Martha Ponce", "Erika Lagata", "Hanah Laurenciano",
    "Aliane Estevez", "Cristina Bola", "Georcelle Afable", "Trisha Nicolas",
    "Ilegna Regio", "Amanda Cortez", "Tristan Yap", "Miggy Fadul",
    "Aareca Legaspi", "Cyrene Ho", "Alexandra Paliza", "Elisse Mangubat",
    "Marcuisha Matthea", "Nikkie Dullate"
  ];

  const INITIAL_BILLS = [
    "Lorena Bustamante", "Richard Mortos", "Celenia Morse", "Jinky Ordelas",
    "Monica Rodriguez", "Elisa Lagata", "Brando Ponce", "Analiza Caliboso",
    "Jamie Santander", "Criselda Urbano Lopez", "Mar Urbano", "Lilibeth Urbano Yap",
    "Jovy Garcia", "Arniza Urbano", "Jaja Alviar", "Marj Barnachea",
    "Mercy Laurenciano", "Lotlot Ordelas"
  ];

  const INITIAL_ROSES = [
    "Cris Ruado", "Joseph Ordelas", "Khenjie Rodriguez", "Rodolfo Moncatar",
    "Ashton Ordelas", "Asher Ordelas", "Edward Ponce", "Lorrenz Bustamante",
    "Santino Santiago", "Adam Vinzon", "Harry Bismonte", "Marko Benson",
    "Alexander Perilla", "Aiden Dela Cruz", "Juan Llanillo", "Andrei Alcober",
    "Sean Prado", "Ashton Abaya"
  ];

  const INITIAL_CANDLES = [
    "Caila Jenine Ruado", "Jade Laurenciano", "Santino Santiago", "Lorrenz Bustamante",
    "Georcelle Afable", "Harry Bismonte", "Marko Benson", "Alexander Perilla",
    "Mariz De Guzman", "Sean Yalung", "Amanda Cortez", "Trisha Lipago",
    "Elisse Mangubat", "Micah Antiga", "Zyrrah Bigayan", "Ashton Abaya",
    "Nikkie Dullate", "Marcuisha Matthea"
  ];

  const INITIAL_SHOTS = [
    "Julius Ruado", "Rai Ruado", "Julia Ruado", "Kathleen Papio",
    "Carina Ruado", "Caila Jenine Ruado", "Jade Laurenciano", "Martha Ponce",
    "Janela Dalangin", "Rafael Reynes", "Nikkie Dullate", "Marcuisha Matthea",
    "Zyrrah Bigayan", "Micah Antiga", "Mariz de Guzman", "Elisse Mangubat",
    "Sean Prado", "Trisha Lipago"
  ];

// Update all 6 state initializers to use "v4"
const [cotillion, setCotillion] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_cotillion_v4"); // Changed to v4
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length === 15) return parsed;
    if (parsed.length < 15) {
      return [...parsed, ...Array(15 - parsed.length).fill("")];
    }
    return parsed.slice(0, 15);
  }
  return INITIAL_COTILLION;
});

const [treasures, setTreasures] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_treasures_v4"); // Changed to v4
  return saved ? JSON.parse(saved) : INITIAL_TREASURES;
});

const [bills, setBills] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_bills_v4"); // Changed to v4
  return saved ? JSON.parse(saved) : INITIAL_BILLS;
});

const [roses, setRoses] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_roses_v4"); // Changed to v4
  return saved ? JSON.parse(saved) : INITIAL_ROSES;
});

const [candles, setCandles] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_candles_v4"); // Changed to v4
  return saved ? JSON.parse(saved) : INITIAL_CANDLES;
});

const [shots, setShots] = useState<string[]>(() => {
  const saved = localStorage.getItem("debut_shots_v4"); // Changed to v4
  return saved ? JSON.parse(saved) : INITIAL_SHOTS;
});

// Update all 6 useEffect setters to save to "v4"
useEffect(() => {
  localStorage.setItem("debut_cotillion_v4", JSON.stringify(cotillion)); // Changed to v4
}, [cotillion]);

useEffect(() => {
  localStorage.setItem("debut_treasures_v4", JSON.stringify(treasures)); // Changed to v4
}, [treasures]);

useEffect(() => {
  localStorage.setItem("debut_bills_v4", JSON.stringify(bills)); // Changed to v4
}, [bills]);

useEffect(() => {
  localStorage.setItem("debut_roses_v4", JSON.stringify(roses)); // Changed to v4
}, [roses]);

useEffect(() => {
  localStorage.setItem("debut_candles_v4", JSON.stringify(candles)); // Changed to v4
}, [candles]);

useEffect(() => {
  localStorage.setItem("debut_shots_v4", JSON.stringify(shots)); // Changed to v4
}, [shots]);

  const handleNameChange = (
    listName: "cotillion" | "treasures" | "bills" | "roses" | "candles" | "shots",
    index: number,
    value: string
  ) => {
    const lists = { cotillion, treasures, bills, roses, candles, shots };
    const setFunctions = {
      cotillion: setCotillion,
      treasures: setTreasures,
      bills: setBills,
      roses: setRoses,
      candles: setCandles,
      shots: setShots
    };

    const updated = [...lists[listName]];
    updated[index] = value;
    setFunctions[listName](updated);
  };

  const renderNameInput = (
    listName: "cotillion" | "treasures" | "bills" | "roses" | "candles" | "shots",
    index: number,
    value: string
  ) => {
    return (
      <div className="flex items-center justify-center py-[1.5px] border-b border-amber-900/10 text-soft-ink w-full relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleNameChange(listName, index, e.target.value)}
          placeholder=".........................................."
          className="w-full bg-transparent font-garamond italic text-[20px] text-amber-950 text-center placeholder-amber-900/30 focus:outline-hidden focus:border-amber-700/50 border-b border-transparent py-0 leading-tight hover:border-amber-900/20 transition-all font-semibold"
        />
      </div>
    );
  };

  return (
    <section className="py-20 px-6 md:px-12 relative overflow-hidden bg-[#fcedf0]" id="symbols">
      {/* Decorative background ambient glows */}
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <div className="absolute top-1/4 left-1/12 w-96 h-96 bg-primary-rose-light/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/3 right-1/12 w-96 h-96 bg-gold-light/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16 select-none font-garamond">
          <span className="font-cinzel text-xs tracking-[0.26em] uppercase text-primary-rose block mb-2">
            Traditions of the Evening
          </span>
          <h2 className="font-playfair text-[42px] md:text-6xl text-primary-rose italic font-medium leading-tight">
            18 Symbols of a Debut
          </h2>
        </div>

        {/* Responsive Grid of Royal Scroll Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-6">
          
          {/* Category 1: Cotillion de Honor */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            {/* Inner Scroll Parchment Paper (Forward Layer) */}
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              {/* Corner Bouquets overlapping the edges of paper and background */}
              <img 
                src={FLOWER_IMAGE} 
                alt="Vintage Flower Bouquet" 
                className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md"
              />
              <img 
                src={FLOWER_IMAGE} 
                alt="Vintage Flower Bouquet" 
                className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md"
              />

              {/* Inner Filigree Border */}
              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              {/* Added text-center, flex and items-center to ensure strict horizontal alignment */}
              <div className="relative z-10 text-center flex flex-col items-center w-full">              
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  Cotillion de Honor
                </h3>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {cotillion.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("cotillion", idx, name)}
                      
                      {/* Every 2 inputs (after each couple), insert a lovely dotted separator and space */}
                      {idx % 2 === 1 && idx < 9 && (
                        <div className="h-4 flex items-center justify-center select-none pointer-events-none opacity-20 my-1">
                          <span className="text-[10px] text-amber-950 font-semibold tracking-widest">
                            ..........................................
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category 2: 18 Treasures */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md" />
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />

              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center w-full">
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  18 Treasures
                </h3>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {treasures.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("treasures", idx, name)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category 3: 18 Bills */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md" />
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />

              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center w-full">              
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  18 Bills
                </h3>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {bills.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("bills", idx, name)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category 4: 18 Roses */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md" />
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />

              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center w-full">              
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  18 Roses
                </h3>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {roses.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("roses", idx, name)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category 5: 18 Candles, One Memory Box */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md" />
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />

              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center w-full">              
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  18 Candles
                </h3>
                <p className="text-[12px] font-garamond text-amber-900 leading-relaxed font-semibold mb-4 text-center">
                  Each candle bearer is <strong>respectfully requested to provide the same message in written form on a physical note, which will be placed inside the memory box as a keepsake.</strong>
                </p>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {candles.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("candles", idx, name)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category 6: 18 Shots */}
          <div 
            className="group relative rounded-none p-6 md:p-8 flex flex-col justify-stretch min-h-[560px] bg-cover bg-center border border-amber-900/10 overflow-visible shadow-none"
            style={{ backgroundImage: `url(${BRIDGERTON_BACKGROUND})` }}
          >
            <div 
              className="relative z-10 w-full h-full bg-cover bg-center rounded-none p-6 flex flex-col justify-between border border-amber-950/10 shadow-none"
              style={{ backgroundImage: `url(${PARCHMENT_IMAGE})` }}
            >
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -top-7 -left-7 w-24 h-24 object-contain z-20 pointer-events-none select-none drop-shadow-md" />
              <img src={FLOWER_IMAGE} alt="Vintage Flower Bouquet" className="absolute -bottom-7 -right-7 w-24 h-24 object-contain z-20 pointer-events-none select-none scale-x-[-1] scale-y-[-1] drop-shadow-md" />

              <div className="absolute inset-2 border border-dashed border-amber-900/15 rounded-none pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center w-full">              
                <h3 className="font-playfair text-2xl text-amber-950 italic font-bold mb-1 mt-4 text-center">
                  18 Shots
                </h3>
                
                <div className="grid grid-cols-1 border-t border-amber-900/10 pt-4 w-full gap-y-0">
                  {shots.map((name, idx) => (
                    <React.Fragment key={idx}>
                      {renderNameInput("shots", idx, name)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}