import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

const QR_IMAGE = "/assets/images/gcash-qr.jpg?v=2";

export default function GiftCard() {
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
          <p className="font-garamond text-base text-[#8a5a32] mt-4 leading-relaxed">
            GCash to GCash is free. A fee may apply if you send from another bank.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
