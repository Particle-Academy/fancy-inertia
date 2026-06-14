import { describe, expect, it, vi, beforeEach } from "vitest";

const { createRoot, hydrateRoot } = vi.hoisted(() => ({
  createRoot: vi.fn(() => ({ render: vi.fn(), unmount: vi.fn() })),
  hydrateRoot: vi.fn(),
}));
vi.mock("react-dom/client", () => ({ createRoot, hydrateRoot }));

// Isolate the mount decision from the real provider tree.
vi.mock("../buildFancyAppTree", () => ({ buildFancyAppTree: () => "TREE" }));

import { setupFancyApp } from "../setupFancyApp";

const App = (() => null) as never;
function fakeEl(hasChildren: boolean): HTMLElement {
  return { hasChildNodes: () => hasChildren } as unknown as HTMLElement;
}

describe("setupFancyApp", () => {
  beforeEach(() => {
    createRoot.mockClear();
    hydrateRoot.mockClear();
  });

  it("hydrates when hydrate=true", () => {
    setupFancyApp({ el: fakeEl(false), App, props: {}, hydrate: true });
    expect(hydrateRoot).toHaveBeenCalledOnce();
    expect(createRoot).not.toHaveBeenCalled();
  });

  it("creates a fresh root when hydrate=false", () => {
    setupFancyApp({ el: fakeEl(true), App, props: {}, hydrate: false });
    expect(createRoot).toHaveBeenCalledOnce();
    expect(hydrateRoot).not.toHaveBeenCalled();
  });

  it("auto-detects: hydrates when the element has server-rendered children", () => {
    setupFancyApp({ el: fakeEl(true), App, props: {} });
    expect(hydrateRoot).toHaveBeenCalledOnce();
  });

  it("auto-detects: creates a fresh root when the element is empty", () => {
    setupFancyApp({ el: fakeEl(false), App, props: {} });
    expect(createRoot).toHaveBeenCalledOnce();
  });
});
