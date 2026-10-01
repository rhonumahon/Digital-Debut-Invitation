import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";

type Slide = {
  src: string;
  alt: string;
  fit?: string;
};

type DebutantMomentProps = {
  image: string;
  alt: string;
  kicker: string;
  motto: string;
  reason: string;
  video?: string;
  slides?: Slide[];
  wide?: boolean;
  tall?: boolean;
  flip?: boolean;
  heading?: string;
  headingKicker?: string;
};

export default function DebutantMoment({
  image,
  alt,
  kicker,
  motto,
  reason,
  video,
  slides,
  wide = false,
  tall = false,
  flip = false,
  heading,
  headingKicker,
}: DebutantMomentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = slides?.length ?? 0;

  useEffect(() => {
    if (slideCount < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = slidesRef.current;
    if (!frame) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (!entry.isIntersecting) return;
      timer = window.setInterval(() => {
        setSlideIndex((current) => (current + 1) % slideCount);
      }, 2000);
    }, { threshold: 0.4 });
    observer.observe(frame);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [slideCount]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [video]);

  const columns = wide
    ? flip
      ? "max-w-5xl md:grid-cols-[0.85fr_1.15fr]"
      : "max-w-5xl md:grid-cols-[1.15fr_0.85fr]"
    : "max-w-4xl md:grid-cols-2";

  const frame = wide
    ? "aspect-[4/3] object-[center_18%]"
    : video
      ? "aspect-[9/16] object-center"
      : tall
        ? "aspect-[2/3]"
        : "aspect-[3/4] object-[center_12%]";

  const seam = flip
    ? "border-t border-[#c4894a]/45 md:border-t-0 md:border-r"
    : "border-t border-[#c4894a]/45 md:border-t-0 md:border-l";

  return (
    <section className="px-6 md:px-12 pt-6 pb-16">
      <SectionFlourish />
      {heading && (
        <Reveal className="text-center mb-10">
          {headingKicker && (
            <span className="font-cinzel text-sm tracking-[0.22em] uppercase text-white block mb-2 drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
              {headingKicker}
            </span>
          )}
          <h2 className="font-playfair text-[42px] md:text-6xl text-white italic font-medium leading-tight drop-shadow-[0_2px_12px_rgba(7,24,46,0.4)]">
            {heading}
          </h2>
        </Reveal>
      )}
      <Reveal className={`bronze-card mx-auto grid items-stretch gap-0 overflow-hidden rounded-3xl ${columns}`}>
        <figure className={`relative overflow-hidden ${flip ? "md:order-2" : ""}`}>
          {slides && slides.length > 0 && (
            <div ref={slidesRef} className={`relative overflow-hidden bg-[#07182e] ${video ? "aspect-[2/3]" : frame}`}>
              {slides.map((slide, index) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  aria-hidden={index !== slideIndex}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${slide.fit ?? "object-center"} ${index === slideIndex ? "opacity-100" : "opacity-0"}`}
                />
              ))}
            </div>
          )}
          {video ? (
            <video
              ref={videoRef}
              src={video}
              poster={image}
              aria-label={alt}
              className={`w-full object-cover bg-[#07182e] ${frame} ${slides?.length ? "border-t border-[#f09060]/35" : ""}`}
              playsInline
              muted
              loop
              controls
              preload="metadata"
            />
          ) : !slides?.length ? (
            <img src={image} alt={alt} className={`w-full object-cover ${frame}`} />
          ) : null}
        </figure>
        <div className={`relative flex flex-col justify-center p-7 md:p-9 text-center ${seam} ${flip ? "md:order-1" : ""}`}>
          <p className="relative text-[#a8642c] font-garamond text-sm font-bold uppercase tracking-[0.16em]">
            {kicker}
          </p>
          <h2 className="relative font-playfair italic text-[#7a3e18] text-3xl md:text-4xl leading-snug mt-3">
            {motto}
          </h2>
          <div className="relative h-px w-16 bg-gradient-to-r from-transparent via-[#c4894a]/70 to-transparent mx-auto mt-4" />
          <p className="relative font-garamond italic text-[#5c3418] text-lg leading-relaxed mt-4">
            {reason}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
