import { describe, expect, it, vi } from "vitest";
import { ConfirmController, normalizeConfirm } from "./confirm-controller";

describe("normalizeConfirm", () => {
  it("fills cancel/confirm labels and the destructive flag", () => {
    expect(normalizeConfirm({ title: "Hi" })).toEqual({
      title: "Hi",
      body: undefined,
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      destructive: false,
    });
  });

  it("defaults a destructive request to a Delete verb but respects an explicit label", () => {
    expect(normalizeConfirm({ title: "x", destructive: true }).confirmLabel).toBe("Delete");
    expect(normalizeConfirm({ title: "x", destructive: true, confirmLabel: "Move to trash" }).confirmLabel).toBe("Move to trash");
  });
});

describe("ConfirmController", () => {
  it("resolves true on confirm and pushes the dialog state to the listener", async () => {
    const c = new ConfirmController();
    const seen = vi.fn();
    c.subscribe(seen);

    const promise = c.confirm({ title: "Delete region?", destructive: true });
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Delete region?", destructive: true }));

    c.settle(true);
    await expect(promise).resolves.toBe(true);
    expect(seen).toHaveBeenLastCalledWith(null); // dialog cleared
  });

  it("resolves false on cancel", async () => {
    const c = new ConfirmController();
    const promise = c.confirm({ title: "x" });
    c.settle(false);
    await expect(promise).resolves.toBe(false);
  });

  it("settles only once (idempotent)", async () => {
    const c = new ConfirmController();
    const promise = c.confirm({ title: "x" });
    c.settle(true);
    c.settle(false); // no-op
    await expect(promise).resolves.toBe(true);
  });

  it("cancels an in-flight request when a new one opens", async () => {
    const c = new ConfirmController();
    const first = c.confirm({ title: "first" });
    const second = c.confirm({ title: "second" });
    await expect(first).resolves.toBe(false);
    c.settle(true);
    await expect(second).resolves.toBe(true);
  });
});
