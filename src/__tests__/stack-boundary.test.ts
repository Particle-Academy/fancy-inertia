import { describe, expect, it, vi } from "vitest";

/*
 * The stack lives on `@particle-academy/fancy-inertia/stack`, not the root, so
 * an app that only wants the detector or AppUpdateAlert never loads
 * fancy-app-update's stack entry (and the react-fancy >=5.41.0 Toast.Stack it
 * is built from). This pins that the ROOT module graph does not reach it.
 */

const loaded = { stack: false };

vi.mock("@particle-academy/fancy-app-update/stack", () => {
  loaded.stack = true;
  return { AppUpdateStack: () => null };
});

describe("package root", () => {
  it("does not load the stack entry", async () => {
    const root = await import("../index");

    expect(loaded.stack).toBe(false);
    expect("AppUpdateStack" in root).toBe(false);
    // The check hook IS on the root: it carries no UI.
    expect(typeof root.useInertiaVersionCheck).toBe("function");
  });

  it("the /stack entry does", async () => {
    await import("../stack");
    expect(loaded.stack).toBe(true);
  });
});
