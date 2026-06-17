import { describe, it, expect } from "vitest";
import { buildActivityItems } from "./activity";

const titlesById = new Map([
  ["w1", "Anchor schedule — Block B"],
  ["w2", "Roof anchor point"],
]);
const namesById = new Map([
  ["u1", "M. Okafor"],
  ["u2", "R. Vasquez"],
]);

describe("buildActivityItems", () => {
  it("maps comments, versions, and share audits with the right tone + text", () => {
    const items = buildActivityItems({
      comments: [
        {
          id: "c1",
          worksheet_id: "w1",
          author_id: "u2",
          body: "Should this use the SLS combination?",
          resolved: false,
          created_at: "2026-06-17T10:00:00Z",
        },
      ],
      versions: [
        {
          id: "v1",
          worksheet_id: "w1",
          created_by: "u1",
          label: "Pre-review",
          created_at: "2026-06-17T09:00:00Z",
        },
      ],
      audits: [
        {
          id: 7,
          actor_id: "u1",
          action: "share",
          target_id: "w2",
          metadata: { role: "editor" },
          created_at: "2026-06-17T11:00:00Z",
        },
      ],
      titlesById,
      namesById,
    });

    expect(items).toHaveLength(3);
    // Newest first → the share audit leads.
    expect(items[0]).toMatchObject({
      actorName: "M. Okafor",
      text: "shared Roof anchor point",
      detail: "Role: Editor",
      tone: "pass",
    });
    expect(items[1]).toMatchObject({ text: "commented on Anchor schedule — Block B", tone: "warning" });
    expect(items[1].detail).toContain("Should this use");
    expect(items[2]).toMatchObject({ text: "saved a version of Anchor schedule — Block B", tone: "accent", detail: "Pre-review" });
  });

  it("ignores unrelated audit actions and caps the list", () => {
    const audits = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      actor_id: "u1",
      action: i % 2 === 0 ? "share" : "export", // half are unrelated
      target_id: "w1",
      metadata: null,
      created_at: `2026-06-17T${String(i).padStart(2, "0")}:00:00Z`,
    }));
    const items = buildActivityItems({
      comments: [],
      versions: [],
      audits,
      titlesById,
      namesById,
      limit: 5,
    });
    expect(items).toHaveLength(5);
    expect(items.every((i) => i.text.startsWith("shared"))).toBe(true);
  });

  it("falls back to 'Someone' / 'a worksheet' for unknown ids", () => {
    const items = buildActivityItems({
      comments: [
        { id: "c", worksheet_id: "wX", author_id: null, body: "hi", resolved: false, created_at: "2026-06-17T10:00:00Z" },
      ],
      versions: [],
      audits: [],
      titlesById,
      namesById,
    });
    expect(items[0].actorName).toBe("Someone");
    expect(items[0].text).toContain("a worksheet");
  });
});
