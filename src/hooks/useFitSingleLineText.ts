import { useLayoutEffect, type RefObject } from "react";

type FitOptions = {
  /** Start size in px (e.g. 45.6 for 2.85rem). */
  maxPx: number;
  minPx: number;
  enabled?: boolean;
};

/** Shrink font-size until text fits on one line inside the container. */
export function useFitSingleLineText(
  containerRef: RefObject<HTMLElement | null>,
  textRef: RefObject<HTMLElement | null>,
  { maxPx, minPx, enabled = true }: FitOptions,
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    if (!enabled) {
      text.style.fontSize = "";
      return;
    }

    const fit = () => {
      text.style.whiteSpace = "nowrap";
      let size = maxPx;
      text.style.fontSize = `${size}px`;
      while (text.scrollWidth > container.clientWidth && size > minPx) {
        size -= 0.5;
        text.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, textRef, maxPx, minPx, enabled]);
}

/** Shrink shared font-size on children until the row fits without wrapping. */
export function useFitNavRow(
  barRef: RefObject<HTMLElement | null>,
  itemSelector: string,
  { maxPx, minPx, enabled = true }: FitOptions,
) {
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const items = () => bar.querySelectorAll<HTMLElement>(itemSelector);

    if (!enabled) {
      items().forEach((el) => {
        el.style.fontSize = "";
      });
      return;
    }

    const fit = () => {
      const nodes = items();
      if (!nodes.length) return;
      let size = maxPx;
      const apply = (px: number) => {
        nodes.forEach((el) => {
          el.style.fontSize = `${px}px`;
        });
      };
      apply(size);
      bar.style.flexWrap = "nowrap";
      while (bar.scrollWidth > bar.clientWidth && size > minPx) {
        size -= 0.25;
        apply(size);
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [barRef, itemSelector, maxPx, minPx, enabled]);
}
