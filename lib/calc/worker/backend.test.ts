import { describe, expect, it } from "vitest";
import { makeEngineBackend, PyBackendError } from "./backend";
import type { PythonRunner } from "./python-runner";

/** Records each run and returns a canned envelope chosen from the code. */
function fakeRunner(
  reply: (code: string) => unknown,
): PythonRunner & { calls: { code: string; packages?: readonly string[] }[] } {
  const calls: { code: string; packages?: readonly string[] }[] = [];
  return {
    calls,
    async ensure() {},
    async run(code, opts) {
      calls.push({ code, packages: opts?.packages });
      return reply(code);
    },
  };
}

describe("makeEngineBackend — success paths", () => {
  it("simplify parses an ok envelope and loads sympy", async () => {
    const runner = fakeRunner(() => '{"ok":true,"value":"2*x"}');
    const backend = makeEngineBackend(runner);

    expect(await backend.simplify("x + x")).toBe("2*x");
    expect(runner.calls[0].code).toContain("simplify");
    expect(runner.calls[0].packages).toEqual(["sympy"]);
  });

  it("linearSolve parses a numeric array and loads numpy + scipy", async () => {
    const runner = fakeRunner(() => '{"ok":true,"value":[0.8,1.4]}');
    const backend = makeEngineBackend(runner);

    expect(
      await backend.linearSolve(
        [
          [2, 1],
          [1, 3],
        ],
        [3, 5],
      ),
    ).toEqual([0.8, 1.4]);
    expect(runner.calls[0].code).toContain("np.linalg.solve");
    expect(runner.calls[0].packages).toEqual(["numpy", "scipy"]);
  });

  it("escape hatches forward the body and parse the envelope", async () => {
    const runner = fakeRunner(() => '{"ok":true,"value":42}');
    const backend = makeEngineBackend(runner);

    expect(await backend.sympy<number>("return 42")).toBe(42);
    expect(await backend.scipy<number>("return 42")).toBe(42);
    expect(runner.calls[0].packages).toEqual(["sympy"]);
    expect(runner.calls[1].packages).toEqual(["numpy", "scipy"]);
  });
});

describe("makeEngineBackend — error mapping", () => {
  it("turns an error envelope into a typed PyBackendError", async () => {
    const runner = fakeRunner(
      () => '{"ok":false,"error":{"kind":"SympifyError","message":"bad expr"}}',
    );
    const backend = makeEngineBackend(runner);

    await expect(backend.simplify("@@@")).rejects.toBeInstanceOf(PyBackendError);
    await expect(backend.simplify("@@@")).rejects.toMatchObject({
      kind: "SympifyError",
      message: "bad expr",
    });
  });

  it("rejects a malformed (non-envelope) reply", async () => {
    const runner = fakeRunner(() => "not json");
    const backend = makeEngineBackend(runner);
    await expect(backend.simplify("x")).rejects.toThrow(/malformed JSON/);
  });
});
