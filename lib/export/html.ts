/**
 * Self-contained print HTML (Functional Brief §4.10) — NODE ONLY.
 *
 * Renders `ExportDocument` to a static markup string and wraps it in a complete
 * `<!doctype html>` document with everything inlined: the KaTeX stylesheet (with
 * its web fonts rewritten to base64 data URIs), the Geist Sans/Mono fonts, the
 * design-system color variables, and `@page` print rules. The output is both the
 * HTML export artifact and the exact input handed to Puppeteer's `setContent`,
 * so the PDF and the HTML are byte-identical in layout. No relative URLs remain,
 * so it renders with no server/base URL.
 *
 * STIX Two Text (the `--font-math` face) is fetched at build time by
 * `next/font/google` and is not vendored, so it is left to a serif fallback here;
 * the actual math notation is drawn with KaTeX's own embedded fonts, so this only
 * affects a few inline operators/result pills.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createElement } from "react";
import { ExportDocument, type ExportDocumentProps } from "./document";
import { MARGIN_CSS, pageBox } from "./options";

const require = createRequire(import.meta.url);

/** Resolve a file inside an installed package, from its package root. */
function resolveInPackage(pkg: string, relative: string): string {
  const pkgJson = require.resolve(`${pkg}/package.json`);
  return path.join(path.dirname(pkgJson), relative);
}

function fontDataUri(absPath: string): string {
  const b64 = readFileSync(absPath).toString("base64");
  return `data:font/woff2;base64,${b64}`;
}

let cachedAssets: { katexCss: string; geistFaces: string } | null = null;

/** Read + inline the static font assets once per process. */
function loadAssets(): { katexCss: string; geistFaces: string } {
  if (cachedAssets) return cachedAssets;

  // KaTeX stylesheet, with each `url(fonts/X.woff2)` rewritten to a data URI so
  // the rendered math glyphs need no network or base URL.
  const katexCssPath = resolveInPackage("katex", "dist/katex.min.css");
  const katexFontsDir = path.dirname(katexCssPath) + "/fonts";
  let katexCss = readFileSync(katexCssPath, "utf8");
  katexCss = katexCss.replace(/url\(fonts\/([^)]+?)\.woff2\)/g, (_m, name) => {
    try {
      return `url(${fontDataUri(path.join(katexFontsDir, `${name}.woff2`))})`;
    } catch {
      return _m;
    }
  });

  // Geist Sans + Mono (variable) inlined as @font-face.
  const geistSans = fontDataUri(resolveInPackage("geist", "dist/fonts/geist-sans/Geist-Variable.woff2"));
  const geistMono = fontDataUri(resolveInPackage("geist", "dist/fonts/geist-mono/GeistMono-Variable.woff2"));
  const geistFaces = `
@font-face{font-family:'Geist';font-style:normal;font-weight:100 900;font-display:swap;src:url(${geistSans}) format('woff2');}
@font-face{font-family:'Geist Mono';font-style:normal;font-weight:100 900;font-display:swap;src:url(${geistMono}) format('woff2');}`;

  cachedAssets = { katexCss, geistFaces };
  return cachedAssets;
}

/** Document-level CSS: tokens, base type, page geometry, KaTeX sizing. */
function documentCss(props: ExportDocumentProps): string {
  const { size, orientation, margin } = props.options;
  const box = pageBox(size, orientation);
  const m = MARGIN_CSS[margin];
  return `
:root{
  --font-sans:'Geist',system-ui,-apple-system,'Segoe UI',sans-serif;
  --font-mono:'Geist Mono',ui-monospace,'SF Mono',Menlo,monospace;
  --font-math:'STIX Two Text','Cambria Math',Cambria,'Times New Roman',serif;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;color:#15181D;font-family:var(--font-sans);}
body{padding:0;}
.ex-doc{font-family:var(--font-sans);}
.ex-doc h1{font-family:var(--font-sans);}
.ed-katex{font-family:var(--font-math);}
@page{size:${box.w}px ${box.h}px;margin:${m.top} ${m.right} ${m.bottom} ${m.left};}
/* Hard page break before a flagged row (the inline style on the marker carries
   this too; the rule makes the intent explicit and survives style stripping). */
[data-ex-break]{break-before:page;}
@media print{
  html,body{width:${box.w}px;}
  .ex-region,.ex-doc table,.ex-doc h1{break-inside:avoid;}
  /* TODO(follow-up): for pixel-exact soft-boundary parity with the on-screen
     preview, the body needs explicit per-page containers (shared paginator) —
     deferred this session (see DECISIONS.md). */
}
/* Screen wrapper used for the standalone HTML artifact only. */
@media screen{
  body{background:#D7DBE1;padding:24px;}
  .ex-doc{background:#fff;max-width:${box.w}px;margin:0 auto;padding:${m.top} ${m.right} ${m.bottom} ${m.left};box-shadow:0 1px 3px rgba(20,24,29,0.12),0 6px 18px rgba(20,24,29,0.10);}
}`;
}

/**
 * Build the complete print HTML string. For PDF, header/footer/page-numbers are
 * supplied by Puppeteer templates, so they are NOT in the body; the watermark is
 * always in the body (a repeated, fixed diagonal stamp).
 */
export async function buildExportHtml(props: ExportDocumentProps): Promise<string> {
  const { katexCss, geistFaces } = loadAssets();
  // Dynamic import keeps `react-dom/server` out of Next's static module graph
  // (it rejects static imports of it), and out of any client bundle.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(createElement(ExportDocument, props));
  const watermark = props.options.watermark.trim();
  const watermarkLayer = watermark
    ? `<div class="ex-watermark" aria-hidden="true"><span>${escapeHtml(watermark)}</span></div>`
    : "";
  const watermarkCss = watermark
    ? `.ex-watermark{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;}
.ex-watermark span{transform:rotate(-32deg);font:700 64px/1 var(--font-sans);letter-spacing:0.06em;color:rgba(31,95,191,0.07);white-space:nowrap;text-transform:uppercase;}
.ex-doc{position:relative;z-index:1;}`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(props.title)}</title>
<style>${geistFaces}</style>
<style>${katexCss}</style>
<style>${documentCss(props)}${watermarkCss}</style>
</head>
<body>
${watermarkLayer}
${body}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
