/** object-fit: cover rendered size in container pixel space */
export function coverRenderedSize(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): { width: number; height: number; scale: number } {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    mediaWidth <= 0 ||
    mediaHeight <= 0
  ) {
    return { width: 0, height: 0, scale: 1 };
  }
  const scale = Math.max(
    containerWidth / mediaWidth,
    containerHeight / mediaHeight,
  );
  return {
    scale,
    width: mediaWidth * scale,
    height: mediaHeight * scale,
  };
}

/**
 * Pixel offset matching CSS object-position on object-fit: cover vs centered (50% 50%).
 * Apply on a layer that holds media centered at 50% 50%.
 */
export function objectPositionPanPixels(
  xPercent: number,
  yPercent: number,
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): { x: number; y: number } {
  const { width: rw, height: rh } = coverRenderedSize(
    containerWidth,
    containerHeight,
    mediaWidth,
    mediaHeight,
  );
  return {
    x: ((xPercent - 50) / 100) * (containerWidth - rw),
    y: ((yPercent - 50) / 100) * (containerHeight - rh),
  };
}

export type ObjectCoverPanState = {
  xPercent: number;
  yPercent: number;
  scale: number;
};

export type PanLayerLayout = {
  width: string;
  height: string;
  transform: string;
  transformOrigin: string;
};

/**
 * Full object-cover media box (rw × rh) inside the clip, positioned like
 * object-position on the video — avoids shrinking the layer to the viewport
 * (which cropped/zoomed incorrectly).
 */
export function panLayerLayoutStyle(
  state: ObjectCoverPanState,
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): PanLayerLayout {
  const { width: rw, height: rh } = coverRenderedSize(
    containerWidth,
    containerHeight,
    mediaWidth,
    mediaHeight,
  );
  const left = (state.xPercent / 100) * (containerWidth - rw);
  const top = (state.yPercent / 100) * (containerHeight - rh);
  const origin = `${state.xPercent}% ${state.yPercent}%`;
  const scale = state.scale;

  if (rw <= 0 || rh <= 0) {
    return {
      width: "100%",
      height: "100%",
      transform: "translate3d(0,0,0)",
      transformOrigin: "50% 50%",
    };
  }

  const zoom = scale > 1.001 ? ` scale(${scale})` : "";
  const transform = `translate3d(${left}px, ${top}px, 0)${zoom}`;

  return {
    width: `${rw}px`,
    height: `${rh}px`,
    transform,
    transformOrigin: origin,
  };
}

/** Sync backdrops only follow zoom (original behavior), not horizontal pan. */
export function backdropZoomTransformStyle(
  state: ObjectCoverPanState,
): { transform: string; transformOrigin: string } {
  const origin = `${state.xPercent}% ${state.yPercent}%`;
  const scale = state.scale;
  if (scale <= 1.001) {
    return { transform: "", transformOrigin: "" };
  }
  return {
    transformOrigin: origin,
    transform: `scale(${scale.toFixed(5)})`,
  };
}
