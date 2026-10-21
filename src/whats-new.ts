/**
 * @particle-academy/fancy-inertia/whats-new
 *
 * A per-account "last seen" store for `@particle-academy/fancy-whats-new`'s
 * `storage` prop: the cursor lives on the person's account, behind one route of
 * your app, so it follows them across devices. Pure `fetch`, no import of
 * fancy-whats-new: the store is `{ load, save }`, which is all `storage` asks for.
 *
 * ```tsx
 * import { WhatsNew } from "@particle-academy/fancy-whats-new";
 * import { createHttpStorage } from "@particle-academy/fancy-inertia/whats-new";
 *
 * const storage = createHttpStorage({ url: "/me/seen-notices" });
 * <WhatsNew load={load} storage={storage} />
 * ```
 */

/** The shape fancy-whats-new's `storage` prop takes. */
export interface CursorStorage {
  load(): Promise<string | null>;
  save(cursor: string): Promise<void>;
}

export interface HttpStorageOptions {
  /** One URL: GET returns `{ seen }`, PUT stores `{ seen }`. */
  url: string;
  /** The JSON field holding the cursor, both ways. Default `"seen"`. */
  field?: string;
  /** How `save` sends it. Default `"PUT"`. */
  method?: "PUT" | "POST" | "PATCH";
  /** Extra headers on both requests. */
  headers?: Record<string, string>;
  /** A `fetch` to use instead of the global one. */
  fetch?: typeof fetch;
}

/** Laravel's XSRF-TOKEN cookie, decoded -- what axios sends as X-XSRF-TOKEN. */
function xsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="));
  if (!hit) return null;
  const value = hit.slice("XSRF-TOKEN=".length);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * A store for fancy-whats-new that keeps the last-seen cursor on the account.
 *
 * Both halves THROW on a non-2xx answer, on purpose: a failed load makes the
 * notice show nothing (the person may have seen everything, and a first-visit
 * notice is the false positive), and a failed save is tried again on close.
 * Creating it sends nothing; the notice calls it from effects, so it is SSR-safe.
 */
export function createHttpStorage({
  url,
  field = "seen",
  method = "PUT",
  headers = {},
  fetch: fetcher,
}: HttpStorageOptions): CursorStorage {
  const send = (input: string, init: RequestInit) => (fetcher ?? globalThis.fetch)(input, init);

  return {
    async load() {
      const res = await send(url, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", ...headers },
      });
      if (!res.ok) throw new Error(`createHttpStorage: GET ${url} answered ${res.status}`);
      const body = (await res.json()) as Record<string, unknown> | null;
      const value = body?.[field];
      return typeof value === "string" || typeof value === "number" ? String(value) : null;
    },

    async save(cursor: string) {
      const token = xsrfToken();
      const res = await send(url, {
        method,
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
          ...headers,
        },
        body: JSON.stringify({ [field]: cursor }),
      });
      if (!res.ok) throw new Error(`createHttpStorage: ${method} ${url} answered ${res.status}`);
    },
  };
}
