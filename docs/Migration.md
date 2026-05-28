# Migrating to 0.2 — Ports gone (optional peers fixed in 0.2.1)

`fancy-inertia` 0.2 follows `fancy-screens` 0.4: the custom Port system in fancy-screens has been replaced by Zustand, so the persistence hook this package shipped to bridge it is no longer needed. (0.2.0 also briefly switched `<FancyAppRoot>` to static optional-peer imports; **0.2.1 reverted that** — see §2.)

## What changed

| Before (0.1.x) | After (0.2.x) |
|---|---|
| `usePersistFancyState()` hook | **Removed.** Use Zustand's `persist` middleware per store. |
| `<FancyAppRoot>` lazy-imported `fancy-screens` and `fancy-echarts` at runtime | Lazy again as of **0.2.1** — see the note below. (0.2.0 briefly used static imports.) |
| `withScreens={false}` toggled a dynamic import; you got a `<Passthrough>` while it loaded | `withScreens={false}` never imports `fancy-screens` at all. `withScreens` (default) lazy-loads it behind a `<Suspense>`. |
| Peer dep `@particle-academy/fancy-screens ^0.2` | Peer dep `@particle-academy/fancy-screens ^0.4` |

The `useFancyForm`, `<FancyClientOnly>`, `registerFancyComponents`, and `<InertiaSchemaScreen>` APIs are unchanged.

## Step-by-step migration

### 1. Replace `usePersistFancyState()` with Zustand `persist` middleware

Before:

```tsx
// app-shell
function App({ children }) {
  usePersistFancyState();
  return <FancyAppRoot>{children}</FancyAppRoot>;
}
```

After (per store):

```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist<UserState>(
    (set) => ({ name: "", setName: (n) => set({ name: n }) }),
    { name: "user-storage" },
  ),
);
```

The hook is **removed** in 0.2.x — its import will fail to resolve.

### 2. Optional peers stay optional (corrected in 0.2.1)

> **Note:** 0.2.0 made `fancy-screens` / `fancy-echarts` *static* imports, on the assumption tree-shaking would drop them when unused. It can't: a static import of an **uninstalled** optional peer hard-fails the consumer's Rollup/Vite build before tree-shaking runs (issue #1). **0.2.1 reverts to lazy loading** for the optional peers.

What this means for you:

- The base `fancy-inertia` import graph references **only** `react-fancy`. You can install and build with nothing but `react-fancy` + `@inertiajs/react` and use `<FancyAppRoot>` + `useFancyForm` — no need to install `fancy-screens` or `fancy-echarts`.
- `withScreens` (default `true`) lazy-loads `<ScreenSystem>` behind a `<Suspense fallback={null}>`, so there's a one-tick async window on first mount before any `<Screen>` resolves. If the peer is absent it degrades to a passthrough with a console warning — pass `withScreens={false}` to skip it entirely and silence the warning.
- `withECharts` (default `true`) lazily registers echarts modules in an effect; absent peer → console warning, no crash.

### 3. Bump the `fancy-screens` peer

`fancy-inertia` 0.2 requires `fancy-screens` 0.4+. If you're staying on 0.3.x for some reason, stay on `fancy-inertia` 0.1.x — they're paired by major.

## See also

- [fancy-screens Migration.md](https://github.com/Particle-Academy/fancy-screens/blob/main/docs/Migration.md) — the broader 0.3 → 0.4 story (Ports → Zustand)
