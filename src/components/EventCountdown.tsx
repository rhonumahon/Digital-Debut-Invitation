/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Calendar, MapPin } from "lucide-react";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Hub of the cleaned clock face, as a fraction of countdown-clock.png.
const CLOCK_PIVOT_X = "49.52%";
const CLOCK_PIVOT_Y = "41.09%";

function ClockHand({
  angle,
  length,
  width,
  tone,
}: {
  angle: number;
  length: string;
  width: number;
  tone: "hour" | "minute" | "second";
}) {
  const background =
    tone === "second"
      ? "linear-gradient(90deg, #f0c4b6 0%, #fff1ea 50%, #d4898c 100%)"
      : "linear-gradient(90deg, #9a5560 0%, #f6ddd4 46%, #c47d82 100%)";

  return (
    <div
      className="absolute"
      style={{
        left: CLOCK_PIVOT_X,
        top: CLOCK_PIVOT_Y,
        width,
        height: length,
        transformOrigin: "50% 100%",
        transform: `translate(-50%, -100%) rotate(${angle}deg)`,
        background,
        borderRadius: tone === "second" ? 2 : "40% 40% 15% 15%",
        boxShadow: "0 1px 2px rgba(48, 18, 6, 0.45)",
        zIndex: tone === "hour" ? 1 : tone === "minute" ? 2 : 3,
      }}
    />
  );
}

function LiveClock({ now }: { now: Date }) {
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6;
  const hourAngle = hours * 30;

  return (
    <div className="relative mx-auto w-[min(240px,72vw)]" aria-hidden="true">
      <img
        src="/assets/images/countdown-clock.png?v=3"
        alt=""
        className="block w-full h-auto select-none"
        draggable={false}
      />
      <ClockHand angle={hourAngle} length="10.2%" width={6} tone="hour" />
      <ClockHand angle={minuteAngle} length="13.4%" width={4} tone="minute" />
      <ClockHand angle={secondAngle} length="14.2%" width={2} tone="second" />
      <div
        className="absolute rounded-full"
        style={{
          left: CLOCK_PIVOT_X,
          top: CLOCK_PIVOT_Y,
          width: 14,
          height: 14,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 35% 35%, #f8e6de 0%, #d48980 42%, #8a4550 100%)",
          boxShadow: "0 1px 3px rgba(48, 18, 6, 0.5)",
          zIndex: 4,
        }}
      />
    </div>
  );
}

export default function EventCountdown() {
  // Guests arrive at 5:00 PM. The countdown runs to the 5:40 PM grand entry.
  const eventDate = new Date("2026-11-07T17:40:00").getTime();

  const calculateTimeLeft = (nowMs: number): TimeLeft => {
    const difference = eventDate - nowMs;

    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(timer);
  }, []);

  const timeLeft = calculateTimeLeft(now.getTime());

  return (
    <div className="relative z-20 w-full flex flex-col items-center py-12 px-6">
      <SectionFlourish />

      {/* Elegant Date Divider */}
      <Reveal className="flex items-center gap-4 mb-10 w-full max-w-xs md:max-w-sm justify-center" y={16}>
        <div className="h-[1px] flex-1 bg-outline-variant/60" />
        <span className="font-playfair text-white italic text-lg font-medium drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">2026</span>
        <div className="h-[1px] flex-1 bg-outline-variant/60" />
      </Reveal>

      {/* Direct Event Metadata */}
      <Reveal
        delay={0.12}
        className="flex flex-col sm:flex-row gap-x-8 gap-y-3 justify-center items-center text-white font-garamond text-base md:text-lg mb-12 text-center drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]"
      >
        <span className="flex items-center gap-2">
          <Calendar size={18} className="text-white shrink-0" />
          <strong>Saturday, November 7, 2026 · 5:00 PM</strong>
        </span>
        <span className="hidden sm:inline text-white">|</span>
        <span className="flex items-center gap-2">
          <MapPin size={18} className="text-white shrink-0" />
          <strong>Angelitos Event Center, Batangas City</strong>
        </span>
      </Reveal>

      <Reveal delay={0.22} className="w-full max-w-xl mx-auto flex flex-col items-center">
        <LiveClock now={now} />
        <div className="text-center mt-2 mb-6 drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
          <h3 className="font-playfair text-xl text-white italic font-medium">The Hour Approaches</h3>
          <p className="font-garamond text-base text-white mt-1">Countdown to the grand entry</p>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full">
          {[
            { val: timeLeft.days, unit: "Days" },
            { val: timeLeft.hours, unit: "Hours" },
            { val: timeLeft.minutes, unit: "Mins" },
            { val: timeLeft.seconds, unit: "Secs" },
          ].map((cell) => (
            <div
              key={cell.unit}
              className="bronze-card rounded-2xl px-1.5 py-3 sm:px-3 sm:py-4 text-center"
            >
              <div className="font-playfair text-2xl sm:text-3xl font-bold text-[#7a3e18] leading-none">
                {cell.val.toString().padStart(2, "0")}
              </div>
              <div className="font-cinzel text-[13px] uppercase tracking-normal sm:tracking-[0.14em] text-[#a8642c] mt-2">
                {cell.unit}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

    </div>
  );
}