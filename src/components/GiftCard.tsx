import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

const GCASH_NUMBER = "09165226110";
const QR_IMAGE = "/assets/images/gcash-qr.jpg?v=2";

function gcashAppUrl() {
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "intent://#Intent;scheme=gcash;package=com.globe.gcash.android;end";
  }
  return "gcash://";
}

function copyNumber() {
  const field = document.createElement("textarea");
  field.value = GCASH_NUMBER;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "0";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, GCASH_NUMBER.length);
  document.execCommand("copy");
  document.body.removeChild(field);
  navigator.clipboard?.writeText(GCASH_NUMBER).catch(() => {});
}

export default function GiftCard() {
  const openGcash = () => {
    copyNumber();
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
          <p className="font-garamond text-lg text-[#5c3418] leading-relaxed mt-3">
            Scan or{" "}
            <a
              href={QR_IMAGE}
              download="jaylyn-gcash-qr.jpg"
              className="underline decoration-[#c4894a] underline-offset-4"
            >
              save the QR code
            </a>
            .
          </p>
          <button
            type="button"
            className="invite-btn mt-5 w-full"
            style={{ whiteSpace: "normal" }}
            onClick={openGcash}
          >
            Copy number and open in GCash
          </button>
          <p className="font-garamond text-base text-[#8a5a32] mt-4 leading-relaxed">
            GCash to GCash is free. A fee may apply if you send from another bank.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
