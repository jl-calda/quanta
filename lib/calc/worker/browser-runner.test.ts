import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserRunner } from "./browser-runner";
import {
  initPyodide,
  loadPyodidePackages,
  runPython,
  terminatePyodide,
} from "./pyodide-client";

// Mock the Web Worker client so the browser runner's plumbing is testable in the
// Node test env (no real Worker / Pyodide). vitest hoists vi.mock above imports.
vi.mock("./pyodide-client", () => ({
  initPyodide: vi.fn(),
  loadPyodidePackages: vi.fn(),
  runPython: vi.fn(),
  terminatePyodide: vi.fn(),
}));

describe("createBrowserRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runPython).mockResolvedValue('{"ok":true,"value":"ok"}');
  });

  it("boots the worker, loads requested packages, and forwards code + autoLoad", async () => {
    const result = await createBrowserRunner().run("print(1)", {
      packages: ["sympy"],
      autoLoad: false,
    });
    expect(initPyodide).toHaveBeenCalledOnce();
    expect(loadPyodidePackages).toHaveBeenCalledWith(["sympy"]);
    expect(runPython).toHaveBeenCalledWith("print(1)", { autoLoad: false });
    expect(result).toBe('{"ok":true,"value":"ok"}');
  });

  it("ensure() boots + loads packages without running code", async () => {
    await createBrowserRunner().ensure(["numpy", "scipy"]);
    expect(initPyodide).toHaveBeenCalledOnce();
    expect(loadPyodidePackages).toHaveBeenCalledWith(["numpy", "scipy"]);
    expect(runPython).not.toHaveBeenCalled();
  });

  it("dispose() terminates the worker", () => {
    createBrowserRunner().dispose?.();
    expect(terminatePyodide).toHaveBeenCalledOnce();
  });
});
