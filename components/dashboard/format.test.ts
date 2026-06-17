import { describe, it, expect } from "vitest";
import {
  relativeTime,
  initials,
  greeting,
  firstName,
  calcStatusMeta,
} from "./format";

describe("relativeTime", () => {
  const now = new Date("2026-06-17T12:00:00Z");

  it("reports just now under a minute", () => {
    expect(relativeTime("2026-06-17T11:59:30Z", now)).toBe("Just now");
  });

  it("pluralises minutes and hours", () => {
    expect(relativeTime("2026-06-17T11:59:00Z", now)).toBe("1 minute ago");
    expect(relativeTime("2026-06-17T11:45:00Z", now)).toBe("15 minutes ago");
    expect(relativeTime("2026-06-17T10:00:00Z", now)).toBe("2 hours ago");
  });

  it("uses Yesterday then day counts within a week", () => {
    expect(relativeTime("2026-06-16T10:00:00Z", now)).toBe("Yesterday");
    expect(relativeTime("2026-06-14T12:00:00Z", now)).toBe("3 days ago");
  });

  it("falls back to a calendar date past a week", () => {
    expect(relativeTime("2026-04-28T12:00:00Z", now)).toBe("28 Apr");
  });

  it("includes the year across year boundaries", () => {
    expect(relativeTime("2024-04-28T12:00:00Z", now)).toBe("28 Apr 2024");
  });

  it("returns empty for invalid input", () => {
    expect(relativeTime("not-a-date", now)).toBe("");
  });
});

describe("initials", () => {
  it("takes up to two uppercase initials", () => {
    expect(initials("Maya Okafor")).toBe("MO");
    expect(initials("nadia brunel jones")).toBe("NB");
    expect(initials("Cher")).toBe("C");
  });

  it("handles empty input", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("greeting", () => {
  it("varies by time of day", () => {
    expect(greeting(new Date("2026-06-17T08:00:00"))).toBe("Good morning");
    expect(greeting(new Date("2026-06-17T13:00:00"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-06-17T20:00:00"))).toBe("Good evening");
  });
});

describe("firstName", () => {
  it("capitalises the first token", () => {
    expect(firstName("nadia brunel")).toBe("Nadia");
  });

  it("derives from an email local part", () => {
    expect(firstName("maya@acme.com")).toBe("Maya");
  });

  it("falls back when missing", () => {
    expect(firstName(null)).toBe("there");
    expect(firstName(undefined)).toBe("there");
  });
});

describe("calcStatusMeta", () => {
  it("maps each status to a tone + label", () => {
    expect(calcStatusMeta("current")).toEqual({
      tone: "pass",
      label: "All current",
    });
    expect(calcStatusMeta("stale")).toEqual({
      tone: "warning",
      label: "Needs recalculate",
    });
    expect(calcStatusMeta("error")).toEqual({
      tone: "error",
      label: "Has errors",
    });
  });
});
