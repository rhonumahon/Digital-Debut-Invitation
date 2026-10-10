#!/usr/bin/env node
/**
 * Table-tent QR for the live invitation.
 * Override: INVITATION_PUBLIC_URL=https://your-site.example npm run qr
 */
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url =
  process.env.INVITATION_PUBLIC_URL?.trim() ||
  "https://mydigitalinvitation.netlify.app/";

const assetsDir = join(root, "public/assets");
const pngPath = join(assetsDir, "invitation-table-qr.png");
const svgPath = join(assetsDir, "invitation-table-qr.svg");

await mkdir(assetsDir, { recursive: true });

const opts = {
  errorCorrectionLevel: "H",
  margin: 2,
  color: { dark: "#07182e", light: "#fff6e8" },
};

await QRCode.toFile(pngPath, url, { ...opts, width: 1200 });
await QRCode.toFile(svgPath, url, { ...opts, type: "svg" });

const printHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invitation QR — print</title>
    <style>
      @page { size: A5 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background: #fff6e8;
        color: #07182e;
      }
      .card {
        max-width: 420px;
        margin: 0 auto;
        padding: 1.25rem 1.5rem 1.5rem;
        text-align: center;
      }
      h1 {
        font-size: 1.35rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        margin: 0 0 0.35rem;
      }
      p {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        line-height: 1.45;
      }
      img {
        width: min(100%, 280px);
        height: auto;
        display: block;
        margin: 0 auto 0.75rem;
      }
      .url {
        font-size: 0.72rem;
        word-break: break-all;
        opacity: 0.75;
      }
      @media print {
        body { background: white; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Jaylyn Eirielle · 18</h1>
      <p>Scan to open the digital invitation</p>
      <img src="/assets/invitation-table-qr.png" width="280" height="280" alt="QR code to open the invitation" />
      <p class="url">${url}</p>
    </div>
  </body>
</html>
`;

await writeFile(join(root, "public/table-qr-print.html"), printHtml, "utf8");

console.log(`Invitation URL: ${url}`);
console.log(`Wrote ${pngPath}`);
console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${join(root, "public/table-qr-print.html")}`);
console.log("Print locally: npm run preview → open /table-qr-print.html");
