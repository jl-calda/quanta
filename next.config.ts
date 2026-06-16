import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The calc engine's heavy/symbolic work runs in a Web Worker that loads
  // Pyodide (SymPy / NumPy / SciPy) lazily from a CDN at runtime — there is
  // nothing to bundle for it here. See lib/calc/worker/pyodide.worker.ts.
};

export default nextConfig;
