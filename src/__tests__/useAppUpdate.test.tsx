// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Inertia's usePage supplies the loaded asset version + component name.
vi.mock("@inertiajs/react", () => ({
  usePage: () => ({ version: "v1", component: "Home" }),
}));

import { useAppUpdate } from "../useAppUpdate";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useAppUpdate", () => {
  it("flags an update on a 409 and fires onUpdateAvailable once", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 409 });
    vi.stubGlobal("fetch", fetchMock);
    const onUpd = vi.fn();

    const { result } = renderHook(() =>
      useAppUpdate({ onUpdateAvailable: onUpd, pollOnFocus: false }),
    );

    expect(result.current.updateAvailable).toBe(false);
    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(true);
    expect(onUpd).toHaveBeenCalledTimes(1);

    // sends the loaded version so the server can compare
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Inertia-Version"]).toBe("v1");
    expect(headers["X-Inertia"]).toBe("true");
  });

  it("stays false on a 200 (version current)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    const { result } = renderHook(() => useAppUpdate({ pollOnFocus: false }));
    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it("never false-positives on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useAppUpdate({ pollOnFocus: false }));
    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it("honors a custom check (bypasses the Inertia poll)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppUpdate({ check: () => true, pollOnFocus: false }));
    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dismiss hides it and suppresses further detection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409 }));
    const { result } = renderHook(() => useAppUpdate({ pollOnFocus: false }));

    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.updateAvailable).toBe(false);

    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it("does not check when disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 409 });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppUpdate({ enabled: false, pollOnFocus: false }));
    await act(async () => {
      await result.current.check();
    });
    expect(result.current.updateAvailable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
