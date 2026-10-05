export const ICE_SHARD_SLICE_COUNT = 8;

/** Width of one rising-ice column — edge burst clips the same horizontal band. */
export const ICE_RISING_STRIP_WIDTH_PERCENT = 100 / ICE_SHARD_SLICE_COUNT;

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Same alpha treatment as rising palace slices on the video. */
export function processIceShardFrame(
  img: HTMLImageElement,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(outW / iw, outH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, outW, outH);
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const L = luminance(r, g, b);
    let alpha = Math.max(0, (L - 0.08) * 1.85);
    if (b > r * 0.8 && b > g * 0.75) alpha *= 1.12;
    if (L < 0.06) alpha = 0;
    px[i + 3] = Math.min(255, Math.round(alpha * 210));
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function processIceShardFrameDataUrl(
  img: HTMLImageElement,
  outW: number,
  outH: number,
): string {
  const canvas = processIceShardFrame(img, outW, outH);
  return canvas.width > 0 ? canvas.toDataURL("image/png") : "";
}

/** Matches the soft middle opening on the edge frame overlay. */
export const ICE_SHARD_BAND_MASK =
  "linear-gradient(180deg, #000 0%, #000 9%, transparent 20%, transparent 80%, #000 91%, #000 100%)";

