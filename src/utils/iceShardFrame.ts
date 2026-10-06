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

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 >= edge1) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Preserves PNG alpha; only keys flat white / flat black on fully opaque pixels. */
function elsaBackdropPixelAlpha(r: number, g: number, b: number, srcA: number): number {
  const source = srcA / 255;
  if (source <= 0) return 0;

  const minC = Math.min(r, g, b);
  const maxC = Math.max(r, g, b);
  const chroma = maxC - minC;
  const L = luminance(r, g, b);

  if (srcA < 255) {
    let a = source;
    if (minC >= 246 && L > 0.93 && chroma < 18) {
      a *= smoothstep(252, 232, minC);
    }
    return a;
  }

  let whiteKey = 1;
  if (minC >= 252) {
    whiteKey = 0;
  } else if (minC >= 228) {
    whiteKey = smoothstep(252, 228, minC);
  } else if (L > 0.9 && chroma < 20) {
    whiteKey = smoothstep(0.98, 0.9, L);
  }

  let darkKey = 1;
  if (L <= 0.06) {
    darkKey = 0;
  } else if (L < 0.18 && chroma < 24) {
    darkKey = smoothstep(0.06, 0.18, L);
  }

  return whiteKey * darkKey;
}

/** One 3×3 pass on premultiplied RGBA — softens jagged crystal edges without color halos. */
function featherPremultipliedBackdrop(data: ImageData, w: number, h: number): void {
  const px = data.data;
  const n = w * h;
  const pr = new Float32Array(n);
  const pg = new Float32Array(n);
  const pb = new Float32Array(n);
  const pa = new Float32Array(n);

  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const a = px[i + 3] / 255;
    pa[p] = a;
    pr[p] = px[i] * a;
    pg[p] = px[i + 1] * a;
    pb[p] = px[i + 2] * a;
  }

  const nr = new Float32Array(n);
  const ng = new Float32Array(n);
  const nb = new Float32Array(n);
  const na = new Float32Array(n);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sa = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const p = ny * w + nx;
          sr += pr[p];
          sg += pg[p];
          sb += pb[p];
          sa += pa[p];
          count++;
        }
      }
      const inv = 1 / count;
      const p = y * w + x;
      nr[p] = sr * inv;
      ng[p] = sg * inv;
      nb[p] = sb * inv;
      na[p] = sa * inv;
    }
  }

  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const a = na[p];
    if (a <= 0.003) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    px[i] = Math.min(255, Math.round(nr[p] / a));
    px[i + 1] = Math.min(255, Math.round(ng[p] / a));
    px[i + 2] = Math.min(255, Math.round(nb[p] / a));
    px[i + 3] = Math.round(a * 255);
  }
}

export type RisingSyncBackdropProcessOptions = {
  /** Premultiplied 3×3 feather — crystalled art only; avoids milky white on sync backdrop. */
  softenEdges?: boolean;
};

/**
 * Full-cover Elsa backdrops (RGB or RGBA): cover-fit, clean white-center transparency.
 */
export function processRisingSyncBackdropFrame(
  img: HTMLImageElement,
  outW: number,
  outH: number,
  options?: RisingSyncBackdropProcessOptions,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return canvas;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(outW / iw, outH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;

  ctx.clearRect(0, 0, outW, outH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, outW, outH);
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const alpha = elsaBackdropPixelAlpha(r, g, b, px[i + 3]);

    if (alpha <= 0.004) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }

    px[i + 3] = Math.round(alpha * 255);
  }

  if (options?.softenEdges) {
    featherPremultipliedBackdrop(data, outW, outH);
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

/**
 * Pixels that differ between the no-crystal and crystal backdrops — for a pop-in
 * handoff without a visible horizontal wipe.
 */
export function buildCrystalPopDeltaLayer(
  baseCanvas: HTMLCanvasElement,
  crystalCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d", { alpha: true });
  if (!octx || w <= 0 || h <= 0) return out;

  const bctx = baseCanvas.getContext("2d", { willReadFrequently: true });
  const cctx = crystalCanvas.getContext("2d", { willReadFrequently: true });
  if (!bctx || !cctx) return out;

  const bData = bctx.getImageData(0, 0, w, h);
  const cData = cctx.getImageData(0, 0, w, h);
  const px = cData.data;
  const bp = bData.data;

  for (let i = 0; i < px.length; i += 4) {
    const dr = Math.abs(px[i] - bp[i]);
    const dg = Math.abs(px[i + 1] - bp[i + 1]);
    const db = Math.abs(px[i + 2] - bp[i + 2]);
    const da = Math.abs(px[i + 3] - bp[i + 3]);
    const channelDiff = Math.max(dr, dg, db);

    const lCrystal = luminance(px[i], px[i + 1], px[i + 2]);
    const lBase = luminance(bp[i], bp[i + 1], bp[i + 2]);
    const lDiff = Math.abs(lCrystal - lBase) * 255;

    const score = Math.max(channelDiff, lDiff * 0.9, da * 0.75);
    const keep = smoothstep(4, 38, score);
    const crystalA = px[i + 3] / 255;

    if (keep <= 0.004 || crystalA <= 0.004) {
      px[i + 3] = 0;
      continue;
    }

    px[i + 3] = Math.round(255 * crystalA * keep);
  }

  octx.putImageData(cData, 0, 0);
  return out;
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

