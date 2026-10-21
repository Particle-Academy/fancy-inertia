/**
 * @particle-academy/fancy-inertia/whats-new
 *
 * `@particle-academy/fancy-whats-new`'s `WhatsNew`, with a per-account store as
 * its default: pass `seenUrl` (your route, see the README) and "seen" lives on
 * the person's account, so it follows them across devices; leave it out for a
 * guest and it is the core's localStorage. Every other prop is the core's.
 *
 * ```tsx
 * import { WhatsNew } from "@particle-academy/fancy-inertia/whats-new";
 *
 * <WhatsNew load={load} seenUrl={user ? "/me/seen-notices" : null} />
 * ```
 *
 * `createHttpStorage` is the store itself, for building your own.
 */
import { createElement, useMemo } from "react";
import {
  WhatsNew as CoreWhatsNew,
  type WhatsNewProps as CoreWhatsNewProps,
} from "@particle-academy/fancy-whats-new";

export type {
  WhatsNewApi,
  WhatsNewCard,
  WhatsNewCardAction,
  WhatsNewCardState,
  WhatsNewGroup,
  WhatsNewLabels,
  WhatsNewLoader,
  WhatsNewPosition,
  WhatsNewStorage,
  MissedMode,
  FirstVisitMode,
} from "@particle-academy/fancy-whats-new";

export interface WhatsNewProps extends CoreWhatsNewProps {
  /**
   * The per-account route `createHttpStorage` talks to (GET `{ seen }`, PUT
   * `{ seen }`). Set it for a signed-in person, `null` / unset for a guest
   * (the core's localStorage). Changing it remounts the notice, so signing in
   * reads the account's cursor. An explicit `storage` wins.
   */
  seenUrl?: string | null;
}

/**
 * fancy-whats-new's notice with fancy-inertia's storage default. Mount it once,
 * near the root.
 */
export function WhatsNew({ seenUrl, storage, ...props }: WhatsNewProps) {
  // One store per URL, not one per render: the core reads its store once.
  const account = useMemo(() => (seenUrl ? createHttpStorage({ url: seenUrl }) : undefined), [seenUrl]);

  // Keyed on the URL: the core loads "seen" once per mount, so a sign-in (null
  // -> url) must remount it to ask the account instead of this browser.
  return createElement(CoreWhatsNew, { key: seenUrl ?? "", ...props, storage: storage ?? account });
}

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
