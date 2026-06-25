/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { MapPin, Compass, Landmark, Info, Clock, AlertCircle } from "lucide-react";

export default function VenueCard() {
  const [showMapModal, setShowMapModal] = useState(false);

  return (
    <>
      <div className="group relative overflow-visible rounded-3xl bg-cream-bg shadow-sm border border-outline-variant/30 transition-all hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(129,81,82,0.08)] duration-300 flex flex-col h-full justify-between">
        
        {/* Ornate Estate Manor Image Header (Hotlinked from User HTML) */}
        <div>
          <div className="relative h-64 w-full overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://scontent.fmnl17-8.fna.fbcdn.net/v/t39.30808-6/536278440_1208020288007967_8337849002782860264_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=9kVgk29ZfcgQ7kNvwHXsEeL&_nc_oc=AdrgS4K5OXnY8tzNQVWb3QQCCo34UJnW1ZnqxfZMHEnNWR3hqRqH-aLO7Ybl2V9DrKw&_nc_zt=23&_nc_ht=scontent.fmnl17-8.fna&_nc_gid=eV21q_Y6E986qsAhn9jdJA&_nc_ss=7b289&oh=00_Af-8DbnuJLp592fkM_o6oENlRZQAd5F6Y1Lgx5MMAxqzsA&oe=6A435DC1')`,
              }}
            />
          </div>

          <div className="p-8">
            <h3 className="font-playfair text-2xl text-primary-rose mb-3 italic">Great Eastern Hotel-Aberdeen Court </h3>
          

            {/* Travel/Logistic Details */}
            <div className="space-y-4 border-t border-outline-variant/30 pt-4 font-garamond">
              <p className="text-soft-ink-variant text-lg italic text-center">
                We look forward to sharing this celebration with you.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="px-8 pb-8">
          <button
            onClick={() => setShowMapModal(true)}
            id="view-map-btn"
            className="w-full flex items-center justify-center gap-2 bg-primary-rose-light/10 text-primary-rose hover:bg-primary-rose text-sm font-garamond uppercase tracking-[0.1em] font-semibold py-3 px-5 rounded-full transition-all duration-300 group cursor-pointer border border-primary-rose-light/20"
          >
            <MapPin size={16} className="text-primary-rose group-hover:text-white transition-colors" />
            <span className="group-hover:text-white transition-colors">View Direction Card</span>
          </button>
        </div>
      </div>

      {/* Travelling Guide Parchment Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-[#1b1c1a]/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="relative bg-[#fbf9f5] max-w-lg w-full rounded-2xl border-2 border-gold-light p-8 shadow-2xl animate-scale-up font-garamond">
            {/* Elegant Vintage Frame */}
            <div className="absolute inset-2 border border-outline-variant/30 pointer-events-none rounded-xl" />

            <div className="text-center relative z-10">
              <Landmark className="mx-auto text-gold-accent h-10 w-10 mb-2" />
              <h4 className="font-playfair text-2xl text-primary-rose italic"> Direction & Map</h4>
              <p className="text-gold-accent font-bold uppercase tracking-widest text-xs mt-1">Aberdeen Court</p>

              <hr className="border-outline-variant/40 my-4" />

              {/* Hand Drawn Map Imitation inside the Modal */}
              <div className="bg-[#fff5f8]/85 border border-outline-variant/30 rounded-xl p-4 my-4 relative overflow-hidden shadow-inner font-garamond">
                {/* Vintage map elements decor */}
                <h5 className="font-bold text-soft-ink tracking-wider text-lg text-left mb-2">Courtroom Coordinates</h5>
                <div className="space-y-3 text-left text-lg text-soft-ink-variant">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-rose shrink-0 mt-1.5" />
                    <span><strong>Address:</strong> 1403 Quezon Avenue West Triangle, Quezon City 1104, Metro Manila</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-rose shrink-0 mt-1.5" />
                    <span><strong>Parking:</strong> Secured basement and court entrance valet services available</span>
                  </div>
                </div>
              </div>

              <div className="text-left text-lg text-soft-ink-variant space-y-3 px-1 my-5">
                <p className="flex items-start gap-2">
                  <Clock size={16} className="text-primary-rose mt-0.5 shrink-0" />
                  <span><strong>Registration:</strong> Guests are requested to arrive at <strong>5:30 PM</strong> to locate their assigned table.</span>
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Aberdeen+Court+Quezon+City"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-primary-rose text-white text-xs uppercase tracking-widest font-semibold py-2.5 px-5 rounded-full hover:bg-primary-rose-light text-center transition-colors shadow-sm"
                >
                  Open in Google Maps
                </a>
                <button
                  onClick={() => setShowMapModal(false)}
                  id="close-map-modal-btn"
                  className="bg-cream-container border border-outline-variant text-[#3d1a26] text-xs uppercase tracking-widest font-semibold py-2.5 px-5 rounded-full hover:bg-[#fff5f8] transition-colors cursor-pointer"
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
