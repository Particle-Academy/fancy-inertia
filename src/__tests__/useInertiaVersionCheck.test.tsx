// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAppUpdate as useCoreAppUpdate } from "@particle-academy/fancy-app-update";

vi.mock("@inertiajs/react", () => ({
  usePage: () => ({ version: "v1", component: "Home" }),
}));

import { useInertiaVersionCheck } from "../useInertiaVersionCheck";

/*
 * The Inertia detector as a value of its own (#6), so ANY core component --
 * fancy-app-update's AppUpdateAlert, AppUpdateStack, or the bare hook -- can
 * take it as `check` without fancy-inertia wrapping each one.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useInertiaVersionCheck", () => {
  it("resolves true on a 409 and sends the loaded version", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 409 });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInertiaVersionCheck());

    await expect(result.current()).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(window.location.pathname + window.location.search);
    expect(init.method).toBe("GET");
    expect(init.headers["X-Inertia"]).toBe("true");
    expect(init.headers["X-Inertia-Version"]).toBe("v1");
    expect(init.headers["X-Inertia-Partial-Component"]).toBe("Home");
  });

  it("resolves false when the version is current", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    const { result } = renderHook(() => useInertiaVersionCheck());
    await expect(result.current()).resolves.toBe(false);
  });

  it("never false-positives on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useInertiaVersionCheck());
    await expect(result.current()).resolves.toBe(false);
  });

  it("polls pingUrl when given one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useInertiaVersionCheck({ pingUrl: "/ping" }));
    await result.current();
    expect(fetchMock.mock.calls[0][0]).toBe("/ping");
  });

  it("plugs straight into the core hook as `check`", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409 }));
    const { result } = renderHook(() => {
      const check = useInertiaVersionCheck();
      return useCoreAppUpdate({ check, pollOnFocus: false });
    });

    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(true);
  });
});
