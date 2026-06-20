import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The calc engine's heavy/symbolic work runs in a Web Worker that loads
  // Pyodide (SymPy / NumPy / SciPy) lazily from a CDN at runtime — there is
  // nothing to bundle for the browser path. See lib/calc/worker/pyodide.worker.ts.
  //
  // The Node path (lib/calc/worker/node-runner.ts) loads the `pyodide` npm
  // package in-process. Externalize it so Webpack never tries to bundle its
  // wasm / node:fs runtime; it resolves from node_modules at runtime instead.
  //
  // Export PDF generation (lib/export/pdf.ts) launches headless Chromium via
  // puppeteer-core + @sparticuz/chromium on the Node runtime. Keep them out of
  // the bundle — they ship native/binary assets that must resolve at runtime,
  // and they're only ever reached through a dynamic import behind a node route.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "pyodide"],
};

export default nextConfig;
