// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@inertiajs/react", () => ({
  usePage: () => ({ version: "v1", component: "Home" }),
}));

// A react-fancy from before 5.41.0: Toast exists, Toast.Stack does not.
vi.mock("@particle-academy/react-fancy", () => {
  const Toast = Object.assign(() => null, {});
  return { Toast, Button: () => null, Portal: () => null };
});

import { AppUpdateStack } from "../stack";

/*
 * The react-fancy peer floor stays at 3 for everyone, because the package root
 * works on any of them; only this entry needs Toast.Stack (5.41.0). npm cannot
 * express a per-subpath peer, so an app on an older react-fancy CAN import
 * `/stack`. It must get a message naming the fix -- and an update notice is
 * never worth taking the page down -- not React's "element type is invalid".
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppUpdateStack on a react-fancy without Toast.Stack", () => {
  it("renders nothing and says which version it needs, instead of crashing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<AppUpdateStack check={() => true} />)).not.toThrow();

    expect(document.body.innerHTML).toBe("<div></div>");
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("react-fancy >=5.41.0");
  });
});
