import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The calc engine's heavy/symbolic work runs in a Web Worker that loads
  // Pyodide (SymPy / NumPy / SciPy) lazily from a CDN at runtime — there is
  // nothing to bundle for it here. See lib/calc/worker/pyodide.worker.ts.
  //
  // Export PDF generation (lib/export/pdf.ts) launches headless Chromium via
  // puppeteer-core + @sparticuz/chromium on the Node runtime. Keep them out of
  // the bundle — they ship native/binary assets that must resolve at runtime,
  // and they're only ever reached through a dynamic import behind a node route.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
