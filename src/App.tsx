/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { Share2, Mail, Heart } from "lucide-react";
import HeroBanner, { GOWN_CHANGE_AT } from "./components/HeroBanner";
import EventCountdown from "./components/EventCountdown"; // Imported the new component
import VenueCard from "./components/VenueCard";
import DressCodeCard from "./components/DressCodeCard";
import ProgramCard from "./components/ProgramCard";
import SymbolsSection from "./components/SymbolsSection";
import RSVPSection from "./components/RSVPSection";
import AttendanceForm from "./components/AttendanceForm";
import { readGuestSession, rememberGuest } from "./attendance/session";
import type { FamilyMember } from "./attendance/types";
import FloatingPetals from "./components/FloatingPetals"; // Imported the new FloatingPetals component
import EnvelopeExperience from "./components/EnvelopeExperience";
import GentleNoteCard from "./components/GentleNoteCard";
import DebutantMoment from "./components/DebutantMoment";
import SectionFlourish from "./components/SectionFlourish";
import Reveal, { RevealReadyProvider } from "./components/Reveal";

const INTRO_MUSIC = "/assets/intro.mp3";
const FINALE_MUSIC = "/assets/last20sec.mp3";
const FINALE_LEAD_MS = 20_000;

declare global {
  interface Window {
    __invitationMusicHeld?: boolean;
  }
}

export default function App() {
  const [guestId, setGuestId] = useState<string | null>(() => readGuestSession());
  const [showEnvelope, setShowEnvelope] = useState(() => !readGuestSession());
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptClosing, setPromptClosing] = useState(false);
  const [promptMembers, setPromptMembers] = useState<FamilyMember[] | null>(null);
  const [promptGuestId, setPromptGuestId] = useState<string | null>(null);
  const [protocolOpen, setProtocolOpen] = useState(false);
  const promptCloseTimer = useRef<number | null>(null);
  const preparingGuest = useRef<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finaleMusic, setFinaleMusic] = useState(() => Date.now() >= GOWN_CHANGE_AT - FINALE_LEAD_MS);
  const audioRef = useRef<HTMLAudioElement | null>(
    typeof document === "undefined" ? null : document.getElementById("invitation-audio") as HTMLAudioElement | null,
  );
  const suppressAutoplay = useRef(false);

  useEffect(() => {
    if (finaleMusic) return;
    let timer = 0;
    const arm = () => {
      const wait = GOWN_CHANGE_AT - FINALE_LEAD_MS - Date.now();
      if (wait <= 0) {
        setFinaleMusic(true);
        return;
      }
      timer = window.setTimeout(arm, Math.min(wait, 2_147_483_647));
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [finaleMusic]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !finaleMusic) return;
    const keepPlaying = !audio.paused || isPlaying;
    audio.loop = false;
    if (!audio.src.includes("last20sec.mp3")) audio.src = FINALE_MUSIC;
    if (keepPlaying) {
      audio.play().catch((err) => {
        console.warn("Finale music could not start:", err);
      });
    }
  }, [finaleMusic]);

  useEffect(() => {
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    const frame = window.requestAnimationFrame(toTop);
    window.addEventListener("pageshow", toTop);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", toTop);
    };
  }, []);

  const closePrompt = () => {
    if (!promptOpen || promptClosing) return;
    const openProtocol = () => setProtocolOpen(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPromptOpen(false);
      openProtocol();
      return;
    }
    setPromptClosing(true);
    promptCloseTimer.current = window.setTimeout(() => {
      setPromptOpen(false);
      setPromptClosing(false);
      promptCloseTimer.current = null;
      openProtocol();
    }, 420);
  };

  useEffect(() => {
    return () => {
      if (promptCloseTimer.current) window.clearTimeout(promptCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!protocolOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [protocolOpen]);

  const startMusic = () => {
    const audio = audioRef.current;
    if (!audio || !audio.paused || suppressAutoplay.current) return;
    audio.muted = false;
    audio.volume = 0.35;
    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn("Audio autoplay blocked by browser policy:", err);
      });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) setIsPlaying(true);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const prepareGuest = (nextGuestId: string) => {
    preparingGuest.current = nextGuestId;
    setPromptGuestId(nextGuestId);
    setPromptMembers(null);
    fetch(`/api/family?guestId=${encodeURIComponent(nextGuestId)}`)
      .then((response) => response.json())
      .then((body: { members?: FamilyMember[] }) => {
        if (preparingGuest.current !== nextGuestId) return;
        setPromptMembers(body.members ?? []);
      })
      .catch(() => {
        if (preparingGuest.current !== nextGuestId) return;
        setPromptMembers([]);
      });
  };

  const handleEnterCelebration = (nextGuestId: string) => {
    rememberGuest(nextGuestId);
    setGuestId(nextGuestId);
    setPromptOpen(true);
    setShowEnvelope(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Jaylyn Eirielle's 18th Debutante Ball",
        text: "You are invited to Jaylyn Eirielle's 18th birthday on November 7, 2026 at Angelitos Event Center, Batangas City.",
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Address copied to clipboard! Share the court invite with companions.");
    }
  };

  return (
    <div className="text-soft-ink font-garamond min-h-screen selection:bg-primary-rose-light/30 selection:text-[#07182e] transition-colors duration-300 relative isolate">
      {/* Viewport-sized layer. background-attachment:fixed is ignored by iOS and
          then cover scales the photo to the whole page, so a tall phone only
          shows a zoomed slice. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 min-h-[100lvh] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/rust-navy-bg.jpg')" }}
      />
      
      {/* 
        Global Floating Petals Overlay:
        - fixed inset-0: Keeps the overlay locked to the screen viewport as you scroll.
        - pointer-events-none: Ensures guests can still tap and interact with all elements underneath.
      */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        <FloatingPetals />
      </div>

      {/* Interactive opening sequence envelope */}
      {showEnvelope && (
        <EnvelopeExperience onPrepare={prepareGuest} onEnter={handleEnterCelebration} onOpen={startMusic} />
      )}

      {promptOpen && guestId && promptGuestId === guestId && promptMembers && (
        <div className={`rose-modal fixed inset-0 z-[80] bg-[#06101c]/75 flex items-center justify-center p-4 ${promptClosing ? "closing" : ""}`}>
          <div className="rose-popup bronze-card w-full min-w-0 max-w-lg max-h-[88vh] overflow-x-hidden overflow-y-auto rounded-3xl p-6">
            <style>{`
              @keyframes rosePopup {
                0% {
                  box-shadow: inset 0 0 0 3px rgba(196, 120, 58, 0.2), 0 24px 48px rgba(48, 18, 6, 0.2);
                }
                55% {
                  box-shadow: inset 0 0 48px rgba(255, 214, 160, 0.55), 0 0 36px rgba(196, 120, 58, 0.35);
                }
                100% {
                  box-shadow:
                    inset 0 0 0 1px rgba(255, 248, 236, 0.95),
                    inset 0 0 0 3px rgba(196, 120, 58, 0.35),
                    0 8px 18px rgba(48, 18, 6, 0.28);
                }
              }
              .rose-popup {
                animation: rosePopup 1.7s ease both;
                scrollbar-width: thin;
                scrollbar-color: #f09060 transparent;
              }
              .rose-popup::-webkit-scrollbar {
                width: 4px;
              }
              .rose-popup::-webkit-scrollbar-track {
                background: transparent;
                margin-top: 28px;
                margin-bottom: 28px;
              }
              .rose-popup::-webkit-scrollbar-thumb {
                background: #f09060;
                border-radius: 999px;
              }
              .rose-modal.closing {
                animation: roseModalOut 0.42s ease forwards;
              }
              .rose-modal.closing .rose-popup {
                animation: rosePopupOut 0.42s ease forwards;
              }
              @keyframes roseModalOut {
                from { opacity: 1; }
                to { opacity: 0; }
              }
              @keyframes rosePopupOut {
                from { transform: translateY(0); }
                to { transform: translateY(18px); }
              }
              @media (prefers-reduced-motion: reduce) {
                .rose-popup,
                .rose-modal.closing,
                .rose-modal.closing .rose-popup { animation: none; }
              }
            `}</style>
            <AttendanceForm
              key={guestId}
              guestId={guestId}
              initialMembers={promptMembers}
              showOccasion
              onSaved={() => {
                setFormVersion((version) => version + 1);
                closePrompt();
              }}
            />
            <button
              type="button"
              onClick={closePrompt}
              className="invite-btn mt-3 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {protocolOpen && (
        <div className="fixed inset-0 z-[80] bg-[#06101c]/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="protocol-title"
            className="bronze-card w-full max-w-md rounded-3xl p-7 text-center"
          >
            <p className="font-cinzel text-sm tracking-[0.16em] uppercase text-[#a8642c]">
              Strict protocol
            </p>
            <h2 id="protocol-title" className="font-playfair italic text-2xl text-[#7a3e18] mt-3">
              Invited guests only
            </h2>
            <p className="font-garamond italic text-lg text-[#5c3418] leading-relaxed mt-4">
              This celebration is prepared with care for our invited guests only. We are unable to accommodate additional guests or +1s.
            </p>
            <button
              type="button"
              onClick={() => setProtocolOpen(false)}
              className="invite-btn mt-6 w-full"
            >
              I agree
            </button>
          </div>
        </div>
      )}

      <RevealReadyProvider ready={!showEnvelope}>
      {/* Hero section featuring the overall Somerset Garden backdrop image and falling petals */}
      <HeroBanner titlesVisible={!showEnvelope && !promptOpen && !protocolOpen} />

      {/* Functional Event Details, Metadata & Live Countdown */}
      <EventCountdown />

      <DebutantMoment
        image="/assets/images/debutant-cafe.jpg"
        alt="Jaylyn Eirielle seated by a café window"
        kicker="The one this evening is for"
        motto="Eighteen, and the evening is hers."
        reason="Before the venue, the dress code, and the program, there is Jaylyn. You are invited to see the young woman this night was prepared for."
      />

      {/* Main information columns container structured beautifully */}
      <section className="px-6 md:px-12 pt-8 pb-24 border-y border-outline-variant/30" id="venue">
        <SectionFlourish />
        <div className="max-w-7xl mx-auto">
          
          <Reveal className="text-center mb-16">
            <span className="font-garamond text-base font-bold uppercase tracking-[0.14em] text-white block mb-2 drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
              Angelitos Event Center · Batangas City
            </span>
            <h2 className="font-playfair text-3xl md:text-5xl text-white italic drop-shadow-[0_2px_12px_rgba(7,24,46,0.4)]">
              Evening Coordinates & Protocol
            </h2>
            <p className="font-garamond text-base text-white italic mt-2 max-w-lg mx-auto drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
              Kindly familiarize yourself with the venue details, color motif, and event guidelines as we gather to celebrate this special milestone.
            </p>
            <div className="h-[1px] w-20 bg-outline-variant/50 mx-auto mt-4" />
          </Reveal>

          {/* Core interactive 3-card grid (ProgramCard removed from here) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            <Reveal className="h-full" delay={0.05}>
              <GentleNoteCard />
            </Reveal>
            <div className="h-full">
              <VenueCard />
            </div>
            <div className="h-full">
              <DressCodeCard />
            </div>
          </div>

        </div>
      </section>

      {/* 
        Dedicated Program Section:
        Giving the program timeline a full width block solves the squeezed layout, 
        letting guests view all the events comfortably on both mobile and desktop.
      */}
      <section className="px-6 md:px-12 pt-8 pb-24" id="program">
        <SectionFlourish />
        <Reveal className="max-w-3xl mx-auto">
          <ProgramCard />
        </Reveal>
      </section>

      <DebutantMoment
        image="/assets/images/debutant-nursing.jpg"
        alt="Jaylyn Eirielle in her nursing uniform"
        headingKicker="A short introduction"
        heading="About Jaylyn"
        kicker="Her studies"
        motto="Nursing, at the University of Batangas."
        reason="Jaylyn is taking a nursing course at the University of Batangas. This evening honors her eighteenth year, and the care she is learning to give."
        flip
      />

      <DebutantMoment
        image="/assets/images/debutant-evening.jpg"
        alt="Jaylyn Eirielle"
        kicker="A reason to stay"
        motto="Your presence is the celebration."
        reason="Come to witness her entrance, her performances, and the words she has saved for this night. That is the honor she is asking of you."
        wide
        flip
        slides={[
          {
            src: "/assets/images/debutant-evening.jpg",
            alt: "Jaylyn Eirielle",
            fit: "object-[center_18%]",
          },
          {
            src: "/assets/images/debutant-presence.jpg",
            alt: "Jaylyn Eirielle in warm light",
          },
          {
            src: "/assets/images/debutant-collage.jpg",
            alt: "Jaylyn Eirielle in two portraits",
            fit: "object-[center_32%]",
          },
        ]}
      />

      <DebutantMoment
        image="/assets/images/debutant-elsa.jpg?v=2"
        alt="Jaylyn Eirielle as Elsa in a senior high stage play of Frozen"
        kicker="In senior high"
        motto="She was Elsa, and the name stayed."
        reason="Jaylyn performed as Elsa in a stage play of Frozen. Soon, everyone who saw her at school called her Elsa."
        flip
      />

      <DebutantMoment
        image="/assets/images/debutant-pageant.jpg"
        video="/assets/debutant-pageant.mp4"
        alt="Jaylyn Eirielle walking a pageant stage"
        kicker="On the stage"
        motto="She is also doing pageants."
        reason="Alongside her studies, Jaylyn is also doing pageants, from a childhood crown to the stage she walks now."
        slides={[
          {
            src: "/assets/images/debutant-pageant-kalikasan.jpg",
            alt: "Jaylyn Eirielle as a child, crowned, with flowers and a trophy",
          },
          {
            src: "/assets/images/debutant-pageant-wings.jpg",
            alt: "Jaylyn Eirielle on a pageant stage with painted wings",
          },
          {
            src: "/assets/images/debutant-pageant-ambassador.jpg",
            alt: "Jaylyn Eirielle in her 2026 pageant crown and sashes",
          },
        ]}
      />

      {/* Traditional 18 Symbols/Milestones path selector */}
      <SymbolsSection />

      {/* Elegant parchment style RSVP pass generator */}
      <RSVPSection
        guestId={guestId}
        formVersion={formVersion}
        onIdentify={(nextGuestId) => {
          rememberGuest(nextGuestId);
          setGuestId(nextGuestId);
          setFormVersion((version) => version + 1);
        }}
      />

      {/* Footer styled as seen in user's layout specs */}
      <footer className="border-t border-gold-light/40 w-full pt-8 pb-16 text-center select-none" id="footer">
        <SectionFlourish />
        <Reveal className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    
          {/* Navigational informational links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8 max-w-full text-base font-semibold uppercase tracking-wider text-soft-ink-variant select-none">
            <a href="#hero" className="hover:text-primary-rose transition-colors">Invitation</a>
            <a href="#venue" className="hover:text-primary-rose transition-colors">Venue & Program</a>
            <a href="#symbols" className="hover:text-primary-rose transition-colors">Traditions</a>
            <a href="#rsvp" className="hover:text-primary-rose transition-colors">Confirm</a>
          </div>

          {/* Trademarks and legalities */}
          <p className="font-garamond text-base text-soft-ink-variant tracking-wide leading-relaxed">
           © 2026 Jaylyn Eirielle’s 18th Birthday. All rights reserved. Created and Designed by CyberRawn Technologies Inc. <br />Your presence will make this day even more special.
          </p>
        </Reveal>
      </footer>
      </RevealReadyProvider>

      {/* Background audio lives in index.html so a return visit can start it before the page finishes loading. */}

      {/* Elegant floating theme-aligned Music Player */}
      {!showEnvelope && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              if (audioRef.current) {
                if (isPlaying) {
                  suppressAutoplay.current = true;
                  window.__invitationMusicHeld = true;
                  audioRef.current.pause();
                  setIsPlaying(false);
                } else {
                  suppressAutoplay.current = false;
                  window.__invitationMusicHeld = false;
                  audioRef.current.muted = false;
                  audioRef.current.volume = 0.35;
                  audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                      console.warn("Audio playback failed or was blocked by browser:", err);
                    });
                }
              }
            }}
            className="relative flex items-center justify-center w-14 h-14 bg-[#07182e]/95 border border-gold-accent/50 rounded-full hover:border-primary-rose-light hover:shadow-[0_4px_20px_rgba(240,144,96,0.28)] shadow-lg transition-all duration-300 scale-100 hover:scale-110 active:scale-95 cursor-pointer group backdrop-blur-xs"
            title={isPlaying ? "Mute Background Music" : "Play Background Music"}
            id="music-toggle-floating-btn"
          >
            {/* Decorative Outer Ring rotating if playing */}
            <div className={`absolute inset-0.5 border border-dashed border-gold-accent/45 rounded-full ${isPlaying ? "animate-[spin_24s_linear_infinite]" : ""}`} />
            
            {/* Center Icon */}
            {isPlaying ? (
              <div className="relative text-primary-rose animate-[pulse_2s_infinite] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {/* Elegant music notes floating up */}
                <span className="absolute -top-1 -right-1 text-[8px] animate-bounce select-none text-gold-accent font-semibold">♫</span>
              </div>
            ) : (
              <div className="text-soft-ink-variant/60 relative flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music-4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="3" y1="21" x2="21" y2="3" strokeWidth="1.5"/></svg>
              </div>
            )}
          </button>
        </div>
      )}

    </div>
  );
}