"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, IconButton, Switch } from "@/components/ds";
import {
  DEFAULT_EXPORT_OPTIONS,
  MARGIN_PX,
  pageBox,
  type ExportFormat,
  type ExportOptions,
} from "@/lib/export/options";
import { ExportDocument } from "@/lib/export/document";
import { paginateBlocks } from "@/lib/worksheet/paginate";
import { exportWorksheet } from "@/server/actions/export";
import { useEditor } from "./state/editor-provider";

/* ------------------------------------------------------------------ *
 * Icons (thin-stroke line, matching the mockup)
 * ------------------------------------------------------------------ */
const svg = (c: React.ReactNode, s = 18) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {c}
  </svg>
);
const CloseI = (s?: number) => svg(<path d="M6 6l12 12M18 6 6 18" />, s);
const DownloadI = (s?: number) => svg(<><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>, s);
const PrintI = (s?: number) => svg(<><path d="M6 9V4h12v5" /><rect x="4" y="9" width="16" height="7" rx="1" /><path d="M7 16h10v4H7z" /></>, s);
const PlusI = (s?: number) => svg(<path d="M10 6v8M6 10h8" />, s);
const MinusI = (s?: number) => svg(<path d="M6 10h8" />, s);

const FORMATS: { id: ExportFormat; label: string; sub: string; icon: (s?: number) => React.ReactNode }[] = [
  { id: "pdf", label: "PDF", sub: "Portable document", icon: (s) => svg(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 13.5h1a1 1 0 0 1 0 2h-1zM9.5 13.5v4" /></>, s) },
  { id: "docx", label: "Word", sub: ".docx", icon: (s) => svg(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9 12l1 5 1.5-4 1.5 4 1-5" /></>, s) },
  { id: "html", label: "HTML", sub: "Web page", icon: (s) => svg(<><path d="M5 4l-2 8 2 8" /><path d="M19 4l2 8-2 8" /><path d="M14 4l-4 16" /></>, s) },
  { id: "xlsx", label: "Excel", sub: ".xlsx", icon: (s) => svg(<><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h16M10 4v16" /></>, s) },
  { id: "print", label: "Print", sub: "Send to printer", icon: PrintI },
];

/* ------------------------------------------------------------------ *
 * Option-panel primitives (ported from export-app.jsx)
 * ------------------------------------------------------------------ */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 11 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
      <span style={{ font: "12px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}
function ToggleRow({ label, help, checked, set }: { label: string; help?: string; checked: boolean; set: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", cursor: "pointer" }}>
      <span style={{ marginTop: 1 }}><Switch checked={checked} onChange={(e) => set(e.target.checked)} /></span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", font: "12.5px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
        {help && <span style={{ display: "block", font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{help}</span>}
      </span>
    </label>
  );
}
function Seg<T extends string>({ options, value, set }: { options: { value: T; label: string }[]; value: T; set: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 30, width: "100%" }}>
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => set(o.value)}
            style={{ flex: 1, height: "100%", border: "none", borderLeft: i ? "1px solid var(--border-hairline)" : "none", cursor: "pointer", background: on ? "var(--accent-tint)" : "var(--surface-raised)", color: on ? "var(--accent)" : "var(--text-muted)", font: `${on ? "600" : "500"} 12px/1 var(--font-sans)` }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
const exInput: React.CSSProperties = {
  width: "100%",
  height: 30,
  padding: "0 9px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-strong)",
  background: "var(--surface-raised)",
  font: "12.5px/1 var(--font-sans)",
  color: "var(--text-primary)",
  outline: "none",
};

/* ------------------------------------------------------------------ *
 * Paginated preview — region-atomic pagination that matches the PDF
 *
 * One flowed body is rendered once (hidden) and measured per top-level block;
 * the shared `paginateBlocks` then decides page boundaries exactly the way the
 * print engine flows the document — no region is split, and a hard page break
 * (the `[data-ex-break]` marker emitted by ExportDocument) forces a new page.
 * Each page frame clips the same body translated to that page's first block, so
 * the on-screen pages match the exported PDF for normal content.
 * ------------------------------------------------------------------ */
function PreviewPages({ options, body, zoom }: { options: ExportOptions; body: React.ReactNode; zoom: number }) {
  const dims = pageBox(options.size, options.orientation);
  const pad = MARGIN_PX[options.margin];
  const HEADER_H = 34;
  const FOOTER_H = 30;
  const contentH = dims.h - HEADER_H - FOOTER_H - pad.y * 2;
  const contentW = dims.w - pad.x * 2;

  const measureRef = useRef<HTMLDivElement>(null);
  // The y-offset (within the flowed body) where each page begins.
  const [pageTops, setPageTops] = useState<number[]>([0]);

  useLayoutEffect(() => {
    const wrap = measureRef.current;
    if (!wrap) return;
    const measure = () => {
      const doc = wrap.querySelector(".ex-doc");
      if (!(doc instanceof HTMLElement)) {
        setPageTops([0]);
        return;
      }
      const docTop = doc.getBoundingClientRect().top;
      const tops: number[] = [];
      const ownHeights: number[] = [];
      const breaks: boolean[] = [];
      let pendingBreak = false;
      for (const node of Array.from(doc.children)) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.hasAttribute("data-ex-break")) {
          pendingBreak = true; // a zero-height marker: break before the next block
          continue;
        }
        const rect = node.getBoundingClientRect();
        tops.push(rect.top - docTop);
        ownHeights.push(rect.height);
        breaks.push(pendingBreak);
        pendingBreak = false;
      }
      // Heights from the gap to the next block (captures inter-block margins);
      // the last block uses its own measured height.
      const blocks = tops.map((top, i) => ({
        height: i < tops.length - 1 ? tops[i + 1] - top : ownHeights[i],
        breakBefore: breaks[i],
      }));
      const { pageOfBlock, pageCount } = paginateBlocks(blocks, contentH);
      const nextTops: number[] = [];
      for (let p = 0; p < pageCount; p += 1) {
        const first = pageOfBlock.indexOf(p);
        nextTops.push(first === -1 ? 0 : tops[first]);
      }
      setPageTops(nextTops);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [body, contentW, contentH]);

  return (
    <>
      {/* Hidden measurer: the full flowed body at content width. */}
      <div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", width: contentW, left: -99999, top: 0 }}>
        <div ref={measureRef}>{body}</div>
      </div>

      {pageTops.map((top, i) => (
        <div key={i} style={{ width: dims.w * zoom, height: dims.h * zoom, flex: "0 0 auto" }}>
          <div style={{ width: dims.w, height: dims.h, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <div className="ex-page" style={{ width: dims.w, height: dims.h, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(20,24,29,0.12), 0 6px 18px rgba(20,24,29,0.10)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad.x}px`, height: HEADER_H, borderBottom: "1px solid #E2E5EA", font: "8.5px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: "#6B7480", flex: "0 0 auto" }}>
                <span>{options.header}</span>
                <span />
              </div>
              <div style={{ flex: 1, position: "relative", padding: `${pad.y}px ${pad.x}px`, overflow: "hidden" }}>
                {options.watermark && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
                    <span style={{ transform: "rotate(-32deg)", font: "700 64px/1 var(--font-sans)", letterSpacing: "0.06em", color: "rgba(31,95,191,0.07)", whiteSpace: "nowrap", textTransform: "uppercase" }}>{options.watermark}</span>
                  </div>
                )}
                {/* Clip window: the same body translated to this page's first block. */}
                <div style={{ position: "relative", zIndex: 1, height: contentH, overflow: "hidden" }}>
                  <div style={{ width: contentW, transform: `translateY(${-top}px)` }}>{body}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad.x}px`, height: FOOTER_H, borderTop: "1px solid #E2E5EA", font: "8px/1 var(--font-sans)", color: "#6B7480", flex: "0 0 auto" }}>
                <span>{options.footer}</span>
                <span>Page {i + 1} of {pageTops.length}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div style={{ font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)", paddingTop: 4, textAlign: "center", maxWidth: 360 }}>
        Hard page breaks are exact. Soft boundaries are close — the exported PDF paginates precisely.
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Overlay
 * ------------------------------------------------------------------ */
export function ExportOverlay({ canExport, worksheetTitle }: { canExport: boolean; worksheetTitle: string }) {
  const { state, dispatch, worksheetId } = useEditor();
  const open = state.ui.exportOpen;

  const [zoom, setZoom] = useState(0.62);
  const [o, setO] = useState<ExportOptions>({ ...DEFAULT_EXPORT_OPTIONS, header: "", footer: worksheetTitle });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ExportOptions>(k: K, v: ExportOptions[K]) => setO((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE_EXPORT" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dispatch]);

  // The live document — same component the server renders. Built from the
  // editor's on-screen results, so the preview is exactly the worksheet.
  const docProps = useMemo(
    () => ({ title: worksheetTitle, content: state.content, results: state.results, options: o }),
    [worksheetTitle, state.content, state.results, o],
  );

  if (!open || !canExport) return null;

  const fmtObj = FORMATS.find((f) => f.id === o.format)!;
  const exportLabel = o.format === "print" ? "Print" : `Export ${fmtObj.label}`;

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onExport = async () => {
    setError(null);
    if (o.format === "print") {
      window.print();
      return;
    }
    setBusy(true);
    try {
      if (o.format === "pdf") {
        const res = await fetch(`/api/worksheets/${worksheetId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(o),
        });
        const data = (await res.json()) as { url?: string; filename?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't render the PDF.");
        triggerDownload(data.url, data.filename ?? "worksheet.pdf");
      } else {
        const result = await exportWorksheet({ worksheetId, options: o });
        if (!result.ok) throw new Error(result.error);
        triggerDownload(result.data.url, result.data.filename);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Print and export preview" className="export-overlay" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", background: "var(--surface-paper)" }}>
      {/* top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 14, height: 54, flex: "0 0 54px", padding: "0 18px", background: "var(--surface-chrome)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "600 14px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Export preview</div>
          <div style={{ font: "11.5px/1.2 var(--font-sans)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{worksheetTitle}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>{MinusI(18)}</IconButton>
          <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-muted)", width: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))}>{PlusI(18)}</IconButton>
          <span style={{ width: 1, height: 22, background: "var(--border-hairline)", margin: "0 6px" }} />
          <IconButton label="Close preview" onClick={() => dispatch({ type: "CLOSE_EXPORT" })}>{CloseI(18)}</IconButton>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* preview canvas */}
        <div className="scroll-y" style={{ flex: 1, minWidth: 0, background: "#D7DBE1", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * zoom, padding: "32px 24px 80px" }}>
          <PreviewPages options={o} zoom={zoom} body={<ExportDocument {...docProps} />} />
        </div>

        {/* options + footer */}
        <div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <aside style={{ flex: 1, borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
              <div style={{ font: "600 15px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Export options</div>
            </div>
            <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: "16px 20px 20px" }}>
              <Eyebrow>Format</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {FORMATS.map((f) => {
                  const on = o.format === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => set("format", f.id)}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", border: `1px solid ${on ? "var(--accent)" : "var(--border-hairline)"}`, borderRadius: "var(--radius-sm)", background: on ? "var(--accent-tint)" : "var(--surface-raised)", cursor: "pointer", textAlign: "left", gridColumn: f.id === "print" ? "1 / -1" : "auto" }}
                    >
                      <span style={{ display: "inline-flex", color: on ? "var(--accent)" : "var(--text-muted)" }}>{f.icon(18)}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", font: "12.5px/1.2 var(--font-sans)", fontWeight: 500, color: on ? "var(--accent)" : "var(--text-primary)" }}>{f.label}</span>
                        <span style={{ display: "block", font: "10.5px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>{f.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <Eyebrow>Page</Eyebrow>
              <Field label="Page size"><Seg options={[{ value: "A4", label: "A4" }, { value: "Letter", label: "Letter" }]} value={o.size} set={(v) => set("size", v)} /></Field>
              <Field label="Orientation"><Seg options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} value={o.orientation} set={(v) => set("orientation", v)} /></Field>
              <Field label="Margins"><Seg options={[{ value: "narrow", label: "Narrow" }, { value: "normal", label: "Normal" }, { value: "wide", label: "Wide" }]} value={o.margin} set={(v) => set("margin", v)} /></Field>
              <Field label="Page range"><input className="ex-input" style={exInput} value={o.pageRange} onChange={(e) => set("pageRange", e.target.value)} placeholder="e.g. 1–3, 5" /></Field>

              <div style={{ borderTop: "1px solid var(--border-hairline)", margin: "8px 0 14px" }} />
              <Eyebrow>Content</Eyebrow>
              <ToggleRow label="Show calc steps" help="Expand each result to show the formula with values substituted." checked={o.steps} set={(v) => set("steps", v)} />
              <ToggleRow label="Include inputs summary" help="A table of named inputs at the top of page 1." checked={o.inputsSummary} set={(v) => set("inputsSummary", v)} />
              <ToggleRow label="Include region borders" help="Outline each region — useful for checking sets." checked={o.borders} set={(v) => set("borders", v)} />

              <div style={{ borderTop: "1px solid var(--border-hairline)", margin: "8px 0 14px" }} />
              <Eyebrow>Header &amp; footer</Eyebrow>
              <Field label="Header text"><input className="ex-input" style={exInput} value={o.header} onChange={(e) => set("header", e.target.value)} placeholder="e.g. Acme Safety Engineering" /></Field>
              <Field label="Footer text"><input className="ex-input" style={exInput} value={o.footer} onChange={(e) => set("footer", e.target.value)} /></Field>
              <Field label="Watermark"><input className="ex-input" style={exInput} value={o.watermark} onChange={(e) => set("watermark", e.target.value)} placeholder="e.g. DRAFT — NOT FOR CONSTRUCTION" /></Field>
            </div>
          </aside>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-hairline)", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)" }}>
            {error && <span style={{ font: "11.5px/1.3 var(--font-sans)", color: "var(--status-error)" }}>{error}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => dispatch({ type: "CLOSE_EXPORT" })} disabled={busy}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} iconLeft={o.format === "print" ? PrintI(16) : DownloadI(16)} onClick={onExport} disabled={busy}>
                {busy ? "Working…" : exportLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Print path — the document is portaled to <body> (so print isolation
          can hide all other body children) and revealed only when printing. */}
      {createPortal(
        <div id="export-print-root" aria-hidden="true">
          <ExportDocument {...docProps} />
        </div>,
        document.body,
      )}
    </div>
  );
}
