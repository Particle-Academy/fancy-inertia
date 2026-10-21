// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import { WhatsNew } from "../whats-new";

/*
 * fancy-whats-new's WhatsNew with fancy-inertia's storage default: give it the
 * `seenUrl` of your per-account route and it remembers "seen" there through
 * createHttpStorage; leave it out (a guest) and it is the core's localStorage.
 * The UI is the core's; these tests pin which store is read.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("WhatsNew (fancy-inertia)", () => {
  it("reads the account's cursor from seenUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ seen: "account-7" }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("fancy-whats-new:seen", "browser-3");
    const load = vi.fn().mockResolvedValue([]);

    render(<WhatsNew load={load} seenUrl="/me/seen-notices" />);

    await waitFor(() => expect(load).toHaveBeenCalledWith("account-7"));
    expect(fetchMock.mock.calls[0][0]).toBe("/me/seen-notices");
  });

  it("uses this browser's localStorage without one", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("fancy-whats-new:seen", "browser-3");
    const load = vi.fn().mockResolvedValue([]);

    render(<WhatsNew load={load} seenUrl={null} />);

    await waitFor(() => expect(load).toHaveBeenCalledWith("browser-3"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets an explicit storage win over seenUrl", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const load = vi.fn().mockResolvedValue([]);

    render(<WhatsNew load={load} seenUrl="/me/seen-notices" storage={{ load: () => "mine", save: () => {} }} />);

    await waitFor(() => expect(load).toHaveBeenCalledWith("mine"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the new store when seenUrl changes (signing in)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ seen: "account-7" }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("fancy-whats-new:seen", "browser-3");
    const load = vi.fn().mockResolvedValue([]);

    const { rerender } = render(<WhatsNew load={load} seenUrl={null} />);
    await waitFor(() => expect(load).toHaveBeenCalledWith("browser-3"));

    rerender(<WhatsNew load={load} seenUrl="/me/seen-notices" />);
    await waitFor(() => expect(load).toHaveBeenCalledWith("account-7"));
  });

  it("still exports createHttpStorage from the same entry", async () => {
    const entry = await import("../whats-new");
    expect(typeof entry.createHttpStorage).toBe("function");
  });
});
