// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Shared, hoisted mock state so the mock factories + the tests can both touch it.
const h = vi.hoisted(() => ({
  swWaiting: { current: null as unknown },
  activate: vi.fn(),
  before: [] as Array<(e: unknown) => unknown>,
  visit: vi.fn(),
}));

vi.mock("@inertiajs/react", () => ({
  usePage: () => ({ version: "v1", component: "Home" }),
  router: {
    on: (name: string, cb: (e: unknown) => unknown) => {
      if (name === "before") h.before.push(cb);
      return () => {
        const i = h.before.indexOf(cb);
        if (i >= 0) h.before.splice(i, 1);
      };
    },
    visit: h.visit,
  },
}));

vi.mock("@particle-academy/fancy-pwa", () => ({
  useServiceWorker: () => ({ registered: false, waiting: h.swWaiting.current, activate: h.activate }),
}));

import { usePwaUpdate } from "../pwa/usePwaUpdate";
import { useOfflineGuard } from "../pwa/useOfflineGuard";

afterEach(() => {
  h.swWaiting.current = null;
  h.before.length = 0;
  h.activate.mockClear();
  h.visit.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("usePwaUpdate", () => {
  it("flags updateAvailable + activates the worker when a SW is waiting", () => {
    h.swWaiting.current = { state: "installed" }; // a waiting worker
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    const { result } = renderHook(() => usePwaUpdate({ pollOnFocus: false }));

    expect(result.current.swWaiting).toBe(true);
    expect(result.current.updateAvailable).toBe(true);

    act(() => result.current.refresh());
    expect(h.activate).toHaveBeenCalledTimes(1);
  });

  it("is just the Inertia redeploy detector when no SW is waiting", () => {
    h.swWaiting.current = null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    const { result } = renderHook(() => usePwaUpdate({ pollOnFocus: false }));

    expect(result.current.swWaiting).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
  });
});

describe("useOfflineGuard", () => {
  it("defers a GET visit made while offline and replays it on reconnect", () => {
    vi.stubGlobal("navigator", { onLine: false });

    const { result } = renderHook(() => useOfflineGuard());

    // Inertia fires a `before` event for a GET visit while offline.
    const preventDefault = vi.fn();
    act(() => {
      h.before[0]({ detail: { visit: { url: "/packages", method: "get" } }, preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.blockedUrl).toBe("/packages");
    expect(h.visit).not.toHaveBeenCalled();

    // Reconnect → the deferred visit auto-replays.
    vi.stubGlobal("navigator", { onLine: true });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(h.visit).toHaveBeenCalledWith("/packages");
    expect(result.current.blockedUrl).toBeNull();
  });

  it("does not interfere with non-GET visits (lets forms surface their own errors)", () => {
    vi.stubGlobal("navigator", { onLine: false });

    const { result } = renderHook(() => useOfflineGuard());

    const preventDefault = vi.fn();
    act(() => {
      h.before[0]({ detail: { visit: { url: "/submit", method: "post" } }, preventDefault });
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.blockedUrl).toBeNull();
  });
});
