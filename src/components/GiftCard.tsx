import { useState } from "react";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

const GCASH_QR =
  "00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02089996440303152170200000006560417DWQM4TK3JDNWDGOB25204601653036085802PH5910RO****N U.6009CALICANTO6104123463045538";

const QR_IMAGE = "/assets/images/gcash-qr.jpg?v=2";

function gcashOpenUrl() {
  const path = `com.mynt.gcash/app/006300000800?qrCode=${encodeURIComponent(GCASH_QR)}`;
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return `intent://${path}#Intent;scheme=gcash;package=com.globe.gcash.android;end`;
  }
  return `gcash://${path}`;
}

export default function GiftCard() {
  const [needsUpload, setNeedsUpload] = useState(false);
  const openUrl = gcashOpenUrl();

  const openGcash = () => {
    const started = Date.now();
    window.location.href = openUrl;
    window.setTimeout(() => {
      if (document.visibilityState === "visible" && Date.now() - started < 2200) {
        setNeedsUpload(true);
      }
    }, 1400);
  };

  return (
    <section className="px-6 md:px-12 pt-4 pb-8" id="gift">
      <SectionFlourish />
      <Reveal className="max-w-xl mx-auto">
        <div className="bronze-card rounded-3xl px-6 py-8 md:px-10 text-center">
          <div className="text-center mb-4 select-none">
            <span className="text-[#a8642c] text-sm tracking-widest font-serif">✦ &nbsp; ⚜ &nbsp; ✦</span>
          </div>
          <span className="text-[#a8642c] font-garamond text-base tracking-[0.18em] uppercase block mb-1 font-bold">
            If you wish to give
          </span>
          <h2 className="font-garamond text-3xl text-[#7a3e18] italic font-semibold">
            A gift sent ahead
          </h2>
          <p className="font-garamond text-lg text-[#5c3418] leading-relaxed mt-3">
            The evening asks for your presence. If you would also like to send a gift before then, you may do so through GCash.
          </p>
          <img
            src={QR_IMAGE}
            alt="GCash QR code for RO****N U."
            className="mx-auto mt-6 w-full max-w-[280px] rounded-2xl bg-white"
          />
          <p className="font-cinzel text-base tracking-[0.12em] uppercase text-[#7a3e18] mt-4">
            GCash · RO****N U.
          </p>
          <a
            href={openUrl}
            className="invite-btn mt-5 inline-flex w-full items-center justify-center"
            onClick={(event) => {
              event.preventDefault();
              openGcash();
            }}
          >
            Open in GCash
          </a>
          <a
            href={QR_IMAGE}
            download="jaylyn-gcash-qr.jpg"
            className="mt-4 inline-block font-garamond text-lg text-[#7a3e18] underline decoration-[#c4894a] underline-offset-4"
          >
            Save QR code
          </a>
          <p className="font-garamond text-base text-[#8a5a32] mt-4 leading-relaxed">
            GCash to GCash is free. A fee may apply if you send from another bank.
          </p>
          {needsUpload && (
            <p className="font-garamond text-base text-[#5c3418] mt-3 leading-relaxed">
              If GCash did not open, save the code, then in the app tap QR and upload it. The account is already in the code.
            </p>
          )}
        </div>
      </Reveal>
    </section>
  );
}
