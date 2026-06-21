/**
 * Per-plot image export — serialize an already-rendered plot `<svg>` to a
 * standalone SVG file, or rasterize it to PNG.
 *
 * This is a CLIENT-ONLY browser utility: it reads a node the user already sees on
 * screen and writes a file via an anchor download. There's no server action and no
 * RLS surface — nothing leaves the page. Heavy/async calc work stays in the engine
 * and worker; this is pure DOM/canvas presentation work, fine on the main thread.
 *
 * The on-screen figure styles itself with design-system CSS custom properties
 * (`var(--accent)`, `var(--font-math)`, …). Those don't resolve once the SVG is
 * detached from the document, so we bake them to concrete values read from the
 * LIVE document root (which also captures the active light/dark theme).
 */

/** Width/height of a figure from its viewBox (the on-screen svg is width="100%"). */
function svgDims(svgEl: SVGSVGElement): { w: number; h: number } {
  const vb = svgEl.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) return { w: vb.width, h: vb.height };
  const rect = svgEl.getBoundingClientRect();
  return { w: rect.width || 460, h: rect.height || 300 };
}

/** Replace `var(--token[, fallback])` with concrete values from the live root. */
function resolveCssVars(svg: string): string {
  const root = getComputedStyle(document.documentElement);
  const cache = new Map<string, string>();
  const lookup = (name: string): string => {
    let v = cache.get(name);
    if (v === undefined) {
      v = root.getPropertyValue(name).trim();
      cache.set(name, v);
    }
    return v;
  };
  const re = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*?))?\)/g;
  let out = svg;
  // Iterate so aliased tokens (`--surface-paper: var(--paper)`) fully resolve.
  for (let pass = 0; pass < 8 && out.includes("var("); pass += 1) {
    out = out.replace(re, (_m, name: string, fallback?: string) => {
      const value = lookup(name);
      if (value) return value;
      return fallback != null ? fallback.trim() : "";
    });
  }
  return out;
}

/** A standalone, theme-baked SVG string for the given on-screen figure. */
export function plotToSvgString(svgEl: SVGSVGElement): string {
  const { w, h } = svgDims(svgEl);
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const raw = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${resolveCssVars(raw)}`;
}

/** Create an `<a download>` for a blob URL, click it, and clean up. */
function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not rasterize the plot."));
    img.src = url;
  });
}

/** Download the figure as a standalone .svg file. */
export function downloadPlotSvg(svgEl: SVGSVGElement, filename: string): void {
  const svg = plotToSvgString(svgEl);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename.endsWith(".svg") ? filename : `${filename}.svg`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Download the figure as a PNG, rasterized at `scale`× the on-screen size. */
export async function downloadPlotPng(svgEl: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const { w, h } = svgDims(svgEl);
  const svg = plotToSvgString(svgEl);
  // Fonts must be loaded before drawing, or canvas substitutes a fallback face.
  if (document.fonts?.ready) await document.fonts.ready;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    // Paper-coloured backdrop so transparent regions aren't black in some viewers.
    const paper = getComputedStyle(document.documentElement).getPropertyValue("--surface-paper").trim();
    ctx.fillStyle = paper || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not encode the PNG.");
    const url = URL.createObjectURL(blob);
    try {
      triggerDownload(url, filename.endsWith(".png") ? filename : `${filename}.png`);
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
