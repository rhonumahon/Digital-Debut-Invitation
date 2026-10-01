import { useState } from "react";
import { rememberGuest } from "../attendance/session";
import type { NameMatch } from "../attendance/types";
import AttendanceForm from "./AttendanceForm";
import NameLookup from "./NameLookup";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

interface RSVPSectionProps {
  guestId: string | null;
  formVersion: number;
  onIdentify: (guestId: string) => void;
}

export default function RSVPSection({ guestId, formVersion, onIdentify }: RSVPSectionProps) {
  const [picked, setPicked] = useState<NameMatch | null>(null);

  return (
    <section className="pt-8 pb-28 px-6 md:px-12 relative overflow-hidden" id="rsvp">
      <SectionFlourish />
      <div className="max-w-xl mx-auto relative z-10">
        <Reveal className="bronze-card relative rounded-3xl p-6 md:p-10">
          <h2 className="font-dancing text-4xl text-[#7a3e18] text-center leading-tight">Your answer</h2>
          <p className="font-garamond text-base text-center text-[#8a5a32] mt-2 mb-6">You can change this anytime.</p>
          {guestId ? (
            <AttendanceForm guestId={guestId} reloadToken={formVersion} />
          ) : (
            <div className="space-y-4">
              <NameLookup onChange={setPicked} />
              <button
                type="button"
                disabled={!picked}
                onClick={() => picked && onIdentify(picked.id)}
                className="invite-btn w-full"
              >
                Continue
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export { rememberGuest };
