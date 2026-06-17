/**
 * PDF generation (Functional Brief §4.10) — NODE ONLY.
 *
 * Renders the self-contained print HTML with headless Chromium and lets the
 * browser's print engine paginate natively (`@page` + `break-inside: avoid`).
 * Puppeteer supplies the repeating running header/footer and "Page N of M" via
 * templates, so the PDF matches the on-screen preview while gaining true paged
 * chrome. Chromium is loaded through a dynamic import behind this node-only
 * module so it is never pulled into the client/edge bundle (see
 * next.config `serverExternalPackages`).
 */
import type { ExportDocumentProps } from "./document";
import { buildExportHtml } from "./html";
import { MARGIN_CSS } from "./options";

/**
 * Normalize a user page-range spec to Puppeteer's `pageRanges` syntax (ASCII
 * hyphens, comma-separated). Out-of-range pages are ignored by Puppeteer, so the
 * total page count is not needed here. Empty ⇒ "" (all pages).
 */
function normalizePdfRanges(spec: string): string {
  return (spec ?? "").trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
}

/**
 * Launch a browser. In production (serverless) use puppeteer-core +
 * @sparticuz/chromium; in local dev, fall back to a full `puppeteer` install if
 * present (so contributors don't need the serverless chromium binary).
 */
async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");

  if (process.env.NODE_ENV !== "production") {
    try {
      // Optional dev dependency; resolved dynamically so the bundler/install
      // never requires it.
      const full = (await import(/* webpackIgnore: true */ "puppeteer" as string)) as {
        executablePath?: () => string;
      };
      const execPath = full.executablePath?.();
      if (execPath) {
        return puppeteer.launch({ executablePath: execPath, headless: true, args: ["--no-sandbox"] });
      }
    } catch {
      // No local full puppeteer — fall through to @sparticuz/chromium.
    }
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/** Small inline-styled chunk for the repeating header/footer templates. */
function chrome(textLeft: string, textRight: string): { header: string; footer: string } {
  const wrap = (left: string, right: string, isFooter: boolean) => `
<div style="width:100%;font-family:'Geist',sans-serif;font-size:8px;color:#6B7480;
            padding:0 16mm;display:flex;justify-content:space-between;align-items:center;
            ${isFooter ? "" : "letter-spacing:0.05em;text-transform:uppercase;"}">
  <span>${left}</span>
  <span>${right}</span>
</div>`;
  return {
    header: wrap(escapeHtml(textLeft), "", false),
    footer: wrap(
      escapeHtml(textRight),
      'Page <span class="pageNumber"></span> of <span class="totalPages"></span>',
      true,
    ),
  };
}

/** Render the worksheet props to a PDF buffer. */
export async function renderPdf(props: ExportDocumentProps): Promise<Buffer> {
  const html = await buildExportHtml(props);
  const { options } = props;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const hasChrome = Boolean(options.header || options.footer);
    const { header, footer } = chrome(options.header || props.title, options.footer || props.title);

    const pdf = await page.pdf({
      format: options.size === "Letter" ? "letter" : "a4",
      landscape: options.orientation === "landscape",
      printBackground: true,
      margin: MARGIN_CSS[options.margin],
      displayHeaderFooter: hasChrome,
      headerTemplate: hasChrome ? header : "<span></span>",
      footerTemplate: hasChrome ? footer : "<span></span>",
      pageRanges: normalizePdfRanges(options.pageRange),
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
