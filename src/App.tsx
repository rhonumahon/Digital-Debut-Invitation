/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { Share2, Mail, Heart } from "lucide-react";
import HeroBanner, { GOWN_CHANGE_AT } from "./components/HeroBanner";
import EventCountdown from "./components/EventCountdown"; // Imported the new component
import VenueCard from "./components/VenueCard";
import DressCodeCard from "./components/DressCodeCard";
import ProgramCard from "./components/ProgramCard";
import SymbolsSection from "./components/SymbolsSection";
import RSVPSection from "./components/RSVPSection";
import AttendanceForm from "./components/AttendanceForm";
import { clearGuestSession, readGuestSession, rememberGuest } from "./attendance/session";
import type { FamilyMember } from "./attendance/types";
import FloatingPetals from "./components/FloatingPetals"; // Imported the new FloatingPetals component
import EnvelopeExperience from "./components/EnvelopeExperience";
import GentleNoteCard from "./components/GentleNoteCard";
import GiftCard from "./components/GiftCard";
import DebutantMoment from "./components/DebutantMoment";
import {
  syncBackdropOpeningRevealCompleteAt,
  type RisingIceCrystalsWindow,
} from "./components/RisingIceCrystalsOverlay";
import SectionFlourish from "./components/SectionFlourish";
import Reveal, { RevealReadyProvider } from "./components/Reveal";
import {
  InvitationAudioProvider,
  notifyInvitationUserActivation,
} from "./contexts/InvitationAudioContext";
import {
  clearInvitationMediaActivation,
  notifyInvitationCelebrationVisible,
  startInvitationMomentVideoPreload,
} from "./utils/momentVideoRegistry";
import { useFitNavRow } from "./hooks/useFitSingleLineText";

const INTRO_MUSIC = "/assets/intro.mp3";
const FINALE_MUSIC = "/assets/last20sec.mp3";
const FINALE_LEAD_MS = 20_000;

const SYNC_BACKDROP_STRENGTH = 0.68;

const DEBUT_RISING_ICE_WINDOWS: RisingIceCrystalsWindow[] = [
  {
    start: 6,
    end: 10,
    backgroundImage: "/assets/images/elsa-ice-palace-vertical.png",
    syncBackdropImage: "/assets/images/elsa-rising-sync-backdrop.png?v=8",
    syncBackdropStrength: SYNC_BACKDROP_STRENGTH,
    syncBackdropHoldUntil: 27,
  },
  {
    start: 17.5,
    end: 20,
    backgroundImage: "/assets/images/elsa-ice-palace-vertical.png",
    sliceSide: "right",
    syncBackdropImage: "/assets/images/elsa-rising-sync-backdrop.png?v=8",
    syncBackdropStrength: SYNC_BACKDROP_STRENGTH,
    syncBackdropHoldUntil: 27,
  },
  {
    start: 18,
    end: 20.2,
    backgroundImage: "/assets/images/elsa-ice-palace-vertical.png",
    sliceIndices: [5],
    sliceRiseDelay: 0.18,
    syncBackdropImage: "/assets/images/elsa-rising-sync-backdrop.png?v=8",
    syncBackdropStrength: SYNC_BACKDROP_STRENGTH,
    syncBackdropHoldUntil: 27,
  },
  {
    start: 20.5,
    end: 22,
    backgroundImage: "/assets/images/elsa-ice-palace-vertical.png",
    syncBackdropImage: "/assets/images/elsa-rising-sync-backdrop.png?v=8",
    syncBackdropStrength: SYNC_BACKDROP_STRENGTH,
    syncBackdropHoldUntil: 27,
  },
];

/** Matches `public/assets/debutant-elsa.mp4` clip length (seconds). */
const DEBUT_ELSA_VIDEO_DURATION_S = 75;

const SNOW_BACKDROP_FADE_OUT_S = 0.7;
const SYNC_OPENING_REVEAL_AT = syncBackdropOpeningRevealCompleteAt(
  DEBUT_RISING_ICE_WINDOWS,
);

declare global {
  interface Window {
    __invitationMusicHeld?: boolean;
  }
}

export default function App() {
  const pageJumpBarRef = useRef<HTMLDivElement>(null);
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

  useFitNavRow(pageJumpBarRef, ".page-jump", {
    maxPx: 14,
    minPx: 9,
    enabled: !showEnvelope,
  });
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
    notifyInvitationUserActivation();
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

  const pageBgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pageBgRef.current;
    if (!el) return;
    const pin = () => {
      const view = window.visualViewport;
      if (!view) return;
      el.style.top = `${view.offsetTop}px`;
      el.style.height = `${Math.ceil(view.height)}px`;
    };
    pin();
    window.visualViewport?.addEventListener("resize", pin);
    window.visualViewport?.addEventListener("scroll", pin);
    window.addEventListener("orientationchange", pin);
    return () => {
      window.visualViewport?.removeEventListener("resize", pin);
      window.visualViewport?.removeEventListener("scroll", pin);
      window.removeEventListener("orientationchange", pin);
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
    flushSync(() => {
      setShowEnvelope(false);
    });
    notifyInvitationUserActivation();
    notifyInvitationCelebrationVisible();
  };

  useEffect(() => {
    if (showEnvelope) return;
    startInvitationMomentVideoPreload();
    if (readGuestSession()) {
      notifyInvitationUserActivation();
    }
    notifyInvitationCelebrationVisible();
  }, [showEnvelope]);

  const returnToEnvelope = () => {
    clearGuestSession();
    clearInvitationMediaActivation();
    preparingGuest.current = null;
    setGuestId(null);
    setPromptGuestId(null);
    setPromptMembers(null);
    setPromptOpen(false);
    setPromptClosing(false);
    setProtocolOpen(false);
    setShowEnvelope(true);
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
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
    <InvitationAudioProvider>
    <div className="text-soft-ink font-garamond min-h-screen selection:bg-primary-rose-light/30 selection:text-[#07182e] transition-colors duration-300 relative isolate">
      {/* Viewport-sized layer. background-attachment:fixed is ignored by iOS and
          then cover scales the photo to the whole page, so a tall phone only
          shows a zoomed slice. */}
      <div
        ref={pageBgRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 -z-10 w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/rust-navy-bg.jpg?v=2')",
          height: "calc(100lvh + env(safe-area-inset-bottom, 0px))",
        }}
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

      {!showEnvelope && (
        <nav
          aria-label="Page"
          className="fixed inset-x-0 top-0 z-40 flex justify-center px-2 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-3 sm:pt-[max(0.45rem,env(safe-area-inset-top))]"
        >
          <div
            ref={pageJumpBarRef}
            className="page-jump-bar flex w-full max-w-[100vw] flex-nowrap items-center justify-center gap-x-3 px-1 sm:gap-x-4 sm:px-0"
          >
            <a href="#symbols" className="page-jump">Traditions</a>
            <a href="#venue" className="page-jump">Venue</a>
            <a href="#rsvp" className="page-jump">RSVP</a>
            <button type="button" onClick={returnToEnvelope} className="page-jump">
              Log out
            </button>
          </div>
        </nav>
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
        image="/assets/images/debutant-evening.jpg"
        alt="Jaylyn Eirielle"
        headingKicker="A short introduction"
        heading="About Jaylyn"
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
        image="/assets/images/debutant-nursing.jpg"
        alt="Jaylyn Eirielle in her nursing uniform"
        kicker="Her studies"
        motto="Nursing, at the University of Batangas."
        reason="Jaylyn is taking a nursing course at the University of Batangas. This evening honors her eighteenth year, and the care she is learning to give."
        flip
      />

      <DebutantMoment
        image="/assets/images/debutant-honors-jhs.jpg"
        alt="Jaylyn Eirielle at her junior high moving-up ceremony with honors"
        kicker="Her honors"
        motto="High Honors, from junior high through senior high."
        reason="Jaylyn was consistent with High Honors through her high school and senior high school years—the same discipline she brings to nursing and to this evening."
        flip
        slides={[
          {
            src: "/assets/images/debutant-honors-jhs.jpg",
            alt: "Jaylyn Eirielle at her junior high moving-up ceremony with honors",
            fit: "object-[center_35%]",
          },
          {
            src: "/assets/images/debutant-honors-shs-medals.jpg",
            alt: "Jaylyn Eirielle in senior high uniform with graduation medals",
            fit: "object-[center_22%]",
          },
          {
            src: "/assets/images/debutant-honors-shs-stage.jpg",
            alt: "Jaylyn Eirielle on stage at senior high recognition with high honors",
            fit: "object-[center_28%]",
          },
          {
            src: "/assets/images/debutant-honors-shs-poster.jpg",
            alt: "Senior high recognition for Jaylyn Eirielle with high honors",
            fit: "object-[center_30%]",
          },
        ]}
      />

      <DebutantMoment
        image="/assets/images/debutant-elsa.jpg?v=2"
        video="/assets/debutant-elsa.mp4"
        videoSound
        compactVideo
        videoEnhance="subtle"
        hideGlobalPetalsWhileInView
        videoTimedBackdrop={{
          start: 0,
          /* Full strength until opening sync columns finish first reveal (~10.45s), then fade. */
          end: SYNC_OPENING_REVEAL_AT + SNOW_BACKDROP_FADE_OUT_S,
          image: "/assets/images/elsa-snow-open-backdrop.png?v=6",
          opacity: 0.94,
          fadeInDuration: 0,
          fadeOutDuration: SNOW_BACKDROP_FADE_OUT_S,
          coverScale: 1.42,
          objectPositionY: 48,
          offsetUpCm: 1,
          offsetLeftCm: 2,
        }}
        videoEdgeBeams={{
          start: 8,
          end: 63,
          dimFrom: 63,
          airyVioletFrom: 42,
          airyVioletUntil: 63,
          pinkGlowFrom: 43,
          pinkGlowUntil: 63,
          fadeInDuration: 2.1,
          fadeOutDuration: 0.65,
        }}
        violetShardAt={[{ time: 13 }, { time: 20 }]}
        videoCrystalMoments={[
          {
            start: 42,
            end: 54,
            style: "side",
            glitterBurst: { start: 46, end: 47.75 },
          },
          { start: 67, end: 74.5, style: "finale" },
        ]}
        risingIceCrystals={DEBUT_RISING_ICE_WINDOWS}
        risingSyncBackdropReplacement={{
          at: 27,
          image: "/assets/images/elsa-crystalled-backdrop.png?v=8",
          revealMode: "pop",
          revealDuration: 3.4,
          /* Crystal exits during the fast ~0:34 zoom; rising sync returns in the same window. */
          holdUntil: 34.25,
          fadeOutDuration: 0.25,
          strength: 0.76,
          syncRestoreStart: 34,
          syncRestoreFadeDuration: 0.25,
          syncRestoreUntil: DEBUT_ELSA_VIDEO_DURATION_S,
          syncRestoreEndFade: 0,
        }}
        iceCrystalAt={[
          { time: 11 },
          { time: 13 },
          { time: 20 },
          { time: 27.5 },
          { time: 43, variant: "grand" },
          { time: 50, variant: "topBreeze", swirl: "left" },
          { time: 52, variant: "topBreeze", swirl: "right" },
          { time: 67, variant: "finale" },
          { time: 67.6, variant: "finale" },
          { time: 68.2, variant: "finale" },
          { time: 68.8, variant: "finale" },
          { time: 69.4, variant: "finale" },
          { time: 70, variant: "finale" },
          { time: 70.6, variant: "finale" },
          { time: 71.2, variant: "finale" },
          { time: 71.8, variant: "finale" },
          { time: 72.4, variant: "finale" },
          { time: 73, variant: "finale" },
          { time: 73.6, variant: "finale" },
          { time: 74.2, variant: "finale" },
        ]}
        icePalaceDoorClose={{
          image: "/assets/images/elsa-ice-palace-vertical.png?v=1",
          closeAt: 73,
          closeDuration: 0.4,
          closedOpacity: 0.58,
          skipPeek: true,
          objectPosition: "center center",
        }}
        videoPanKeyframes={[
          { time: 0, xPercent: 50 },
          { time: 9, xPercent: 16 },
          { time: 15, xPercent: 50 },
          { time: 18, xPercent: 84 },
          { time: 23, xPercent: 16 },
          { time: 28, xPercent: 84 },
          { time: 34, xPercent: 50, scale: 1 },
          { time: 34.25, xPercent: 58, scale: 1.22, ease: "linear" },
          { time: 62.5, xPercent: 58, scale: 1.22 },
          { time: 63, xPercent: 60, scale: 1.62 },
          { time: 66.9, xPercent: 60, scale: 1.62 },
          { time: 67, xPercent: 58, scale: 1, ease: "linear" },
        ]}
        alt="Jaylyn Eirielle as Elsa in a senior high stage play of Frozen"
        kicker="In senior high"
        motto="She was Elsa, and the name stayed."
        reason="Jaylyn performed as Elsa in a stage play of Frozen. Soon, everyone who saw her at school called her Elsa."
        flip
        slides={[
          {
            src: "/assets/images/debutant-elsa.jpg?v=2",
            alt: "Jaylyn Eirielle as Elsa in a senior high stage play of Frozen",
          },
        ]}
      />

      <DebutantMoment
        image="/assets/images/debutant-poster-making.jpg"
        alt="Jaylyn Eirielle working on a poster"
        kicker="In poster and slogan"
        motto="Poster making, slogans, and a national stage."
        reason="Jaylyn also takes up poster making and slogans. At the Philippine Arena National, she won third place."
        flip
        slides={[
          {
            src: "/assets/images/debutant-poster-making.jpg",
            alt: "Jaylyn Eirielle working on a poster",
            fit: "object-[center_30%]",
          },
          {
            src: "/assets/images/debutant-poster-art.jpg",
            alt: "Jaylyn Eirielle's abstract painting poster",
            fit: "object-[center_42%]",
          },
        ]}
      />

      <DebutantMoment
        image="/assets/images/debutant-karate-medals.jpg"
        video="/assets/debutant-karate.mp4"
        videoSound
        stillAboveVideo
        alt="Jaylyn Eirielle in karate gi holding a row of national competition medals and a trophy"
        kicker="Karate Champion"
        motto="Brown Belt First Class."
        reason="Jaylyn trains in karate as a Brown Belt First Class. In national competitions, she has repeatedly stood on top—medals, trophies, and the discipline she carries into everything else."
        flip
        slides={[
          {
            src: "/assets/images/debutant-karate-medals.jpg",
            alt: "Jaylyn Eirielle in karate gi holding a row of national competition medals and a trophy",
            fit: "object-[center_35%]",
          },
          {
            src: "/assets/images/debutant-karate-medals-celebration.jpg",
            alt: "Jaylyn Eirielle in karate gi with rainbow medal ribbons, celebrating a win",
            fit: "object-[center_40%]",
          },
          {
            src: "/assets/images/debutant-karate-competition-ace.jpg",
            alt: "Jaylyn Eirielle at a karate competition with medals, alongside family",
            fit: "object-[center_45%]",
          },
          {
            src: "/assets/images/debutant-karate-trophy-waltermart.jpg",
            alt: "Jaylyn Eirielle holding a karate trophy with family at an awards moment",
            fit: "object-[center_42%]",
          },
          {
            src: "/assets/images/debutant-karate-championship-banner.jpg",
            alt: "Jaylyn Eirielle at the Battle of Pure Traditional Karate Championship with medals and club flags",
            fit: "object-[center_38%]",
          },
        ]}
      />

      <DebutantMoment
        image="/assets/images/debutant-singing.jpg"
        video="/assets/debutant-singing-recital.mp4"
        videoSound
        alt="Jaylyn Eirielle performing at the BCHSA Music-Voice Students Recital"
        kicker="In music and voice"
        motto="BCHSA Music-Voice Students Recital."
        reason="Jaylyn also performs as a music-voice student at BCHSA. At the Music-Voice Students Recital, she takes the stage with the same poise she brings to karate, honors, and everything else she pursues."
        flip
      />

      <DebutantMoment
        image="/assets/images/debutant-pageant.jpg"
        videos={[
          "/assets/debutant-pageant.mp4",
          "/assets/debutant-pageant-2.mp4",
        ]}
        videoSound
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

      <GiftCard />

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
                  notifyInvitationUserActivation();
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
    </InvitationAudioProvider>
  );
}