// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpStorage } from "../whats-new";

/*
 * A per-account last-seen cursor for fancy-whats-new's `storage` prop: GET it,
 * PUT it, over the app's own session. Laravel's CSRF token rides along from the
 * XSRF-TOKEN cookie, the way axios sends it.
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

const ok = (body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status: body === undefined ? 204 : 200,
    headers: { "Content-Type": "application/json" },
  });

describe("createHttpStorage", () => {
  it("creating it sends nothing (it is only called from effects)", () => {
    const fetch = vi.fn();
    createHttpStorage({ url: "/me/seen", fetch });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("load GETs the url, same-origin, and returns the `seen` field", async () => {
    const fetch = vi.fn(async () => ok({ seen: "1.4.0" }));
    await expect(createHttpStorage({ url: "/me/seen", fetch }).load()).resolves.toBe("1.4.0");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/me/seen");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
  });

  it("load returns null for someone who has never been shown anything", async () => {
    const fetch = vi.fn(async () => ok({ seen: null }));
    await expect(createHttpStorage({ url: "/me/seen", fetch }).load()).resolves.toBeNull();
  });

  it("a numeric cursor comes back as a string", async () => {
    const fetch = vi.fn(async () => ok({ seen: 9812 }));
    await expect(createHttpStorage({ url: "/me/seen", fetch }).load()).resolves.toBe("9812");
  });

  it("a failed load THROWS, so the notice shows nothing rather than a first-visit notice", async () => {
    const fetch = vi.fn(async () => new Response("no", { status: 500 }));
    await expect(createHttpStorage({ url: "/me/seen", fetch }).load()).rejects.toThrow(/500/);
  });

  it("save PUTs the cursor as JSON with Laravel's CSRF header from the XSRF-TOKEN cookie", async () => {
    document.cookie = "XSRF-TOKEN=abc%3D%3D; path=/";
    const fetch = vi.fn(async () => ok(undefined));
    await createHttpStorage({ url: "/me/seen", fetch }).save("1.4.0");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/me/seen");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("same-origin");
    expect(JSON.parse(String(init.body))).toEqual({ seen: "1.4.0" });
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-XSRF-TOKEN"]).toBe("abc==");
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("no XSRF-TOKEN cookie, no CSRF header", async () => {
    const fetch = vi.fn(async () => ok(undefined));
    await createHttpStorage({ url: "/me/seen", fetch }).save("x");
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect("X-XSRF-TOKEN" in headers).toBe(false);
  });

  it("a failed save THROWS, so the notice tries again on close", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 419 }));
    await expect(createHttpStorage({ url: "/me/seen", fetch }).save("x")).rejects.toThrow(/419/);
  });

  it("field, method and extra headers are configurable", async () => {
    const fetch = vi.fn(async () => ok({ cursor: "c1" }));
    const store = createHttpStorage({
      url: "/api/notices/seen",
      field: "cursor",
      method: "POST",
      headers: { Authorization: "Bearer t" },
      fetch,
    });
    await expect(store.load()).resolves.toBe("c1");
    await store.save("c2");
    const [, getInit] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const [, saveInit] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect((getInit.headers as Record<string, string>).Authorization).toBe("Bearer t");
    expect(saveInit.method).toBe("POST");
    expect(JSON.parse(String(saveInit.body))).toEqual({ cursor: "c2" });
  });
});
