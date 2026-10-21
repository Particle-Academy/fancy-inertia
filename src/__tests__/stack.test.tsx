// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@inertiajs/react", () => ({
  usePage: () => ({ version: "v1", component: "Home" }),
}));

import { AppUpdateStack, type AppUpdateFeature } from "../stack";

/*
 * #6: fancy-app-update 0.3.0's AppUpdateStack, with the Inertia version check
 * as its default detector -- the same default AppUpdateAlert has. The UI is
 * the core's; these tests pin the WIRING: which detector runs, and that every
 * core prop still reaches the core component.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const FEATURES: AppUpdateFeature[] = [
  { id: "a", title: "Dark mode", description: "Every page, both modes.", image: "/img/dark.png", imageAlt: "Dark mode preview" },
  { id: "b", title: "Faster search" },
];

const fast = { interval: 5, pollOnFocus: false } as const;
const cards = () => document.querySelectorAll("[data-react-fancy-toast-stack-card]");
const front = () => document.querySelector<HTMLElement>('[data-react-fancy-toast-stack-card="front"]')!;

describe("AppUpdateStack (Inertia)", () => {
  it("detects a redeploy through the Inertia 409 by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 409 });
    vi.stubGlobal("fetch", fetchMock);

    render(<AppUpdateStack {...fast} />);

    await waitFor(() => expect(cards().length).toBe(1));
    expect(front().textContent).toContain("Update available");
    // It was the Inertia ping, not the core's ETag HEAD.
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("GET");
    expect(init.headers["X-Inertia-Version"]).toBe("v1");
  });

  it("stays hidden while the Inertia version is current", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    render(<AppUpdateStack {...fast} features={FEATURES} />);
    await act(async () => new Promise((r) => setTimeout(r, 40)));
    expect(document.querySelector("[data-fancy-app-update-stack]")).toBeNull();
  });

  it("passes features, labels and position through to the core", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409 }));
    const onRefresh = vi.fn();

    render(
      <AppUpdateStack
        {...fast}
        features={FEATURES}
        refreshLabel="Reload now"
        closeLabel="Hide"
        position="inline"
        onRefresh={onRefresh}
      />,
    );

    await waitFor(() => expect(cards().length).toBe(2));
    const root = document.querySelector<HTMLElement>("[data-fancy-app-update-stack]")!;
    expect(root.getAttribute("data-position")).toBe("inline");
    expect(front().textContent).toContain("Dark mode");
    expect(front().querySelector("img")!.getAttribute("src")).toBe("/img/dark.png");
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reload now" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("calls a features loader once, when the update is detected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409 }));
    const load = vi.fn(async () => FEATURES);
    render(<AppUpdateStack {...fast} features={load} />);
    await waitFor(() => expect(cards().length).toBe(2));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("passes `render` through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409 }));
    render(
      <AppUpdateStack
        {...fast}
        features={FEATURES}
        render={({ features }) => <p data-testid="mine">{`${features.length} new`}</p>}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("mine").textContent).toBe("2 new"));
  });

  it("a `check` override replaces the Inertia ping", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AppUpdateStack {...fast} check={() => true} />);
    await waitFor(() => expect(cards().length).toBe(1));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a currentVersion + latestVersion pair is left to the core", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AppUpdateStack {...fast} currentVersion="v1" latestVersion={() => "v2"} />);
    await waitFor(() => expect(cards().length).toBe(1));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
