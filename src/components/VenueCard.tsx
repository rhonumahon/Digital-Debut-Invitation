/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { MapPin, Compass, Landmark, Info, Clock, AlertCircle } from "lucide-react";
import Reveal from "./Reveal";

export default function VenueCard() {
  const [showMapModal, setShowMapModal] = useState(false);

  return (
    <>
      <Reveal delay={0.16} className="h-full">
      <div className="bronze-card group relative overflow-visible rounded-3xl transition-all hover:-translate-y-2 duration-300 flex flex-col h-full justify-between">
        
        <div>
          <div className="overflow-hidden rounded-t-3xl">
            <img
              src="/assets/images/angelitos.png"
              alt="Angelito's Event Center"
              className="block aspect-[3/2] w-full object-cover"
            />
          </div>

          <div className="p-8">
            <h3 className="font-playfair text-2xl text-[#7a3e18] mb-3 italic text-center">Angelitos Event Center</h3>
            <div className="space-y-3 border-t border-[#c4894a]/35 pt-4 font-garamond text-center">
              <p className="text-[#5c3418] text-base leading-relaxed">
                Noble St. Corner D, Lt. Col. Danilo S. Atienza, Barangay 7, Batangas City
              </p>
              <p className="text-[#8a5a32] text-lg italic">
                Saturday, November 7, 2026 · 5:00 PM
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="px-8 pb-8">
          <button
            onClick={() => setShowMapModal(true)}
            id="view-map-btn"
            className="invite-btn w-full flex items-center justify-center gap-2"
          >
            <MapPin size={16} />
            <span>View Direction Card</span>
          </button>
        </div>
      </div>
      </Reveal>

      {/* Travelling Guide Parchment Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-[#1b1c1a]/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bronze-card relative max-w-lg w-full rounded-2xl p-8 animate-scale-up font-garamond">
            <div className="text-center relative z-10">
              <Landmark className="mx-auto text-[#a8642c] h-10 w-10 mb-2" />
              <h4 className="font-playfair text-2xl text-[#7a3e18] italic"> Direction & Map</h4>
              <p className="text-[#a8642c] font-bold uppercase tracking-[0.14em] text-sm mt-1">Angelitos Event Center</p>

              <hr className="border-[#c4894a]/40 my-4" />

              <div className="bronze-inset rounded-xl p-4 my-4 relative overflow-hidden font-garamond">
                <h5 className="font-bold text-[#7a3e18] tracking-wider text-lg text-left mb-2">Venue</h5>
                <div className="space-y-3 text-left text-lg text-[#5c3418]">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-rose shrink-0 mt-1.5" />
                    <span><strong>Address:</strong> Noble St. Corner D, Lt. Col. Danilo S. Atienza, Barangay 7, Batangas City</span>
                  </div>
                </div>
              </div>

              <div className="text-left text-lg text-[#5c3418] space-y-3 px-1 my-5">
                <p className="flex items-start gap-2">
                  <Clock size={16} className="text-[#a8642c] mt-0.5 shrink-0" />
                  <span><strong>Arrival:</strong> Guests are requested to arrive at <strong>5:00 PM</strong>.</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Angelitos+Event+Center+Barangay+7+Batangas+City"
                  target="_blank"
                  rel="noreferrer"
                  className="invite-btn w-full text-center sm:w-auto"
                >
                  Open in Google Maps
                </a>
                <button
                  onClick={() => setShowMapModal(false)}
                  id="close-map-modal-btn"
                  className="invite-btn w-full sm:w-auto"
                >
                  Fold Map away
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
