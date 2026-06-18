import { describe, expect, it } from "vitest";
import {
  openCommentCount,
  reidComment,
  sortCommentsAsc,
  upsertComment,
  type CommentItem,
} from "./comments";

function comment(over: Partial<CommentItem> & { id: string }): CommentItem {
  return {
    regionId: "worksheet",
    authorId: "u1",
    authorName: "Nadia Brunel",
    authorInitials: "NB",
    authorColor: "#1F5FBF",
    body: "Looks good",
    resolved: false,
    createdAt: "2026-06-18T10:00:00.000Z",
    ...over,
  };
}

describe("openCommentCount", () => {
  it("counts only unresolved comments", () => {
    const items = [
      comment({ id: "a" }),
      comment({ id: "b", resolved: true }),
      comment({ id: "c" }),
    ];
    expect(openCommentCount(items)).toBe(2);
    expect(openCommentCount([])).toBe(0);
  });
});

describe("sortCommentsAsc", () => {
  it("orders oldest-first and does not mutate the input", () => {
    const input = [
      comment({ id: "new", createdAt: "2026-06-18T12:00:00.000Z" }),
      comment({ id: "old", createdAt: "2026-06-18T09:00:00.000Z" }),
    ];
    const sorted = sortCommentsAsc(input);
    expect(sorted.map((c) => c.id)).toEqual(["old", "new"]);
    expect(input.map((c) => c.id)).toEqual(["new", "old"]); // original untouched
  });
});

describe("upsertComment / reidComment", () => {
  it("appends a new comment and replaces an existing one by id", () => {
    const base = [comment({ id: "a" })];
    const appended = upsertComment(base, comment({ id: "b" }));
    expect(appended.map((c) => c.id)).toEqual(["a", "b"]);

    const replaced = upsertComment(appended, comment({ id: "a", body: "Edited" }));
    expect(replaced.find((c) => c.id === "a")?.body).toBe("Edited");
    expect(replaced).toHaveLength(2);
  });

  it("reids an optimistic temp row to its persisted id, preserving order", () => {
    const items = [comment({ id: "first" }), comment({ id: "temp", pending: true })];
    const reconciled = reidComment(items, "temp", comment({ id: "real-id" }));
    expect(reconciled.map((c) => c.id)).toEqual(["first", "real-id"]);
    expect(reconciled[1].pending).toBeUndefined();
  });
});
