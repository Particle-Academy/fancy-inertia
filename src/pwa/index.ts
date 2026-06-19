/**
 * @particle-academy/fancy-inertia/pwa
 *
 * The Inertia ⇄ PWA adapter — the *synergistic* parts of mixing a PWA with an
 * Inertia app, kept out of fancy-inertia's core (and out of fancy-pwa's core)
 * because it bridges the two:
 *
 *   - usePwaUpdate      one "new version available" signal from BOTH an Inertia
 *                       redeploy (asset-version 409) AND a waiting service
 *                       worker, with a single correct refresh action.
 *   - useOfflineGuard   offline-aware navigation via Inertia's router events —
 *                       defer + auto-replay visits made offline. No SW, no
 *                       caching, no staleness.
 *   - <FancyInertiaPwa> one-mount default chrome wiring both of the above.
 *
 * Deliberately NOT here: caching page responses / intercepting navigations with
 * a service worker — that fights Inertia's server-driven model (see the package
 * README). `@particle-academy/fancy-pwa` is an OPTIONAL peer: only the SW half
 * of `usePwaUpdate` uses it; `useOfflineGuard` is pure Inertia.
 */

export { usePwaUpdate } from "./usePwaUpdate";
export type { UsePwaUpdateOptions, PwaUpdate } from "./usePwaUpdate";

export { useOfflineGuard } from "./useOfflineGuard";
export type { OfflineGuardOptions, OfflineGuardState } from "./useOfflineGuard";

export { FancyInertiaPwa } from "./FancyInertiaPwa";
export type { FancyInertiaPwaProps, PwaCorner } from "./FancyInertiaPwa";
