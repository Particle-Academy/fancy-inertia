import { describe, expect, it, vi } from "vitest";

/*
 * fancy-whats-new is an OPTIONAL peer: only the `/whats-new` entry imports it,
 * so an app that never shows the notice never needs it installed. This pins
 * that the ROOT module graph does not reach it.
 */

const loaded = { whatsNew: false };

vi.mock("@particle-academy/fancy-whats-new", () => {
  loaded.whatsNew = true;
  return { WhatsNew: () => null };
});

describe("package root", () => {
  it("does not load fancy-whats-new", async () => {
    const root = await import("../index");

    expect(loaded.whatsNew).toBe(false);
    expect("WhatsNew" in root).toBe(false);
  });

  it("the /whats-new entry does", async () => {
    await import("../whats-new");
    expect(loaded.whatsNew).toBe(true);
  });
});
