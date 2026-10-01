import { useEffect, useRef } from "react";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

const QR_IMAGE = "/assets/images/gcash-qr.jpg?v=2";

function gcashAppUrl() {
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "intent://#Intent;scheme=gcash;package=com.globe.gcash.android;end";
  }
  return "gcash://";
}

export default function GiftCard() {
  const qrFile = useRef<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(QR_IMAGE)
      .then((response) => response.blob())
      .then((blob) => {
        if (!cancelled) qrFile.current = new File([blob], "jaylyn-gcash-qr.jpg", { type: "image/jpeg" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const openGcash = async () => {
    const file = qrFile.current;
    const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }));
    if (file && canShareFile) {
      try {
        await navigator.share({ files: [file], title: "GCash QR" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    } else {
      const link = document.createElement("a");
      link.href = QR_IMAGE;
      link.download = "jaylyn-gcash-qr.jpg";
      link.click();
    }
    window.location.href = gcashAppUrl();
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
          <button type="button" className="invite-btn mt-5 w-full" onClick={openGcash}>
            Open in GCash
          </button>
          <a
            href={QR_IMAGE}
            download="jaylyn-gcash-qr.jpg"
            className="mt-4 inline-block font-garamond text-lg text-[#7a3e18] underline decoration-[#c4894a] underline-offset-4"
          >
            Save QR code
          </a>
          <p className="font-garamond text-base text-[#8a5a32] mt-4 leading-relaxed">
            Save the code, then in GCash tap QR and upload it. The account opens from the code.
          </p>
          <p className="font-garamond text-base text-[#8a5a32] mt-2 leading-relaxed">
            GCash to GCash is free. A fee may apply if you send from another bank.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
