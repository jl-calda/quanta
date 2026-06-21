import { describe, expect, it } from "vitest";
import { parseProgramBody, programBodyToText } from "./program-text";
import type { ProgramStatement } from "@/lib/calc";

const factorialBody: ProgramStatement[] = [
  { kind: "assign", target: "result", expr: "1" },
  {
    kind: "if",
    branches: [
      {
        cond: "n > 1",
        body: [
          { kind: "for", var: "i", from: "2", to: "n", body: [{ kind: "assign", target: "result", expr: "result * i" }] },
        ],
      },
    ],
  },
  { kind: "return", expr: "result" },
];

describe("program-text", () => {
  it("serializes a nested body to indented text", () => {
    expect(programBodyToText(factorialBody)).toBe(
      ["result := 1", "if n > 1", "  for i in 2..n", "    result := result * i", "return result"].join("\n"),
    );
  });

  it("round-trips a nested body", () => {
    expect(parseProgramBody(programBodyToText(factorialBody))).toEqual(factorialBody);
  });

  it("parses else-if / otherwise branches", () => {
    const text = ["if x > 0", "  s := 1", "else if x < 0", "  s := -1", "otherwise", "  s := 0", "return s"].join("\n");
    const body = parseProgramBody(text);
    expect(body[0]).toEqual({
      kind: "if",
      branches: [
        { cond: "x > 0", body: [{ kind: "assign", target: "s", expr: "1" }] },
        { cond: "x < 0", body: [{ kind: "assign", target: "s", expr: "-1" }] },
      ],
      otherwise: [{ kind: "assign", target: "s", expr: "0" }],
    });
    expect(body[1]).toEqual({ kind: "return", expr: "s" });
  });

  it("parses a while loop and a for-step", () => {
    const body = parseProgramBody(["while x > 0", "  x := x - 1", "for k in 0..10 step 2", "  y := k"].join("\n"));
    expect(body[0]).toEqual({ kind: "while", cond: "x > 0", body: [{ kind: "assign", target: "x", expr: "x - 1" }] });
    expect(body[1]).toEqual({ kind: "for", var: "k", from: "0", to: "10", step: "2", body: [{ kind: "assign", target: "y", expr: "k" }] });
  });

  it("treats a bare expression line as the result", () => {
    expect(parseProgramBody("a + b")).toEqual([{ kind: "return", expr: "a + b" }]);
  });

  it("is empty for blank text", () => {
    expect(parseProgramBody("   \n  \n")).toEqual([]);
  });
});
