import { useEffect, useState } from "react";

type Slide = {
  src: string;
  alt: string;
  fit?: string;
};

export default function FadeSlides({ slides }: { slides: Slide[] }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [holdIndex, setHoldIndex] = useState(0);
  const slideKey = slides.map((item) => item.src).join("|");
  const slideCount = slides.length;

  useEffect(() => {
    if (slideCount < 2) return;
    slideKey.split("|").forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slideCount);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [slideCount, slideKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHoldIndex(slideIndex), 700);
    return () => window.clearTimeout(timer);
  }, [slideIndex]);

  return (
    <>
      {slides.map((item, index) => {
        const on = index === slideIndex;
        const hold = index === holdIndex && !on;
        return (
          <div
            key={item.src}
            aria-hidden={!on}
            className={`fade-slide${on ? " is-on" : ""}${hold ? " is-hold" : ""}`}
          >
            <img
              src={item.src}
              alt={item.alt}
              className={`h-full w-full object-cover ${item.fit ?? "object-center"}`}
            />
          </div>
        );
      })}
    </>
  );
}
