# Migrating to 0.2 — Static providers + Ports gone

`fancy-inertia` 0.2 follows `fancy-screens` 0.4: the custom Port system in fancy-screens has been replaced by Zustand, so the persistence hook this package shipped to bridge it is no longer needed. The `<FancyAppRoot>` provider gymnastics have also been simplified.

## What changed

| Before (0.1.x) | After (0.2.x) |
|---|---|
| `usePersistFancyState()` hook | **Removed.** Use Zustand's `persist` middleware per store. |
| `<FancyAppRoot>` lazy-imported `fancy-screens` and `fancy-echarts` at runtime | Static imports. Providers are sync on first render. |
| `withScreens={false}` toggled a dynamic import; you got a `<Passthrough>` while it loaded | `withScreens={false}` just doesn't mount `<ScreenSystem>`. No transitional render. |
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

### 2. Drop the lazy-provider dance

If you were relying on the fact that `<ScreenSystem>` mounted asynchronously inside `<FancyAppRoot>`, two things change:

- `<ScreenSystem>` now mounts synchronously on first render. Any `<Screen>` rendered in the first frame will succeed immediately.
- The brief "providers loading" window where `useScreens()` returned nothing is gone.

This is a behavior change but virtually always for the better. The one case where it matters: if you were building a bundle that imported `fancy-inertia` but didn't actually use `<ScreenSystem>`, the old code would tree-shake `fancy-screens` out. With static imports, you'll pull it in regardless. If that matters, install `fancy-inertia` without `fancy-screens` as a peer (it's optional) — the import will fail at type level but only your `<FancyAppRoot>` instantiation will trip it, and you'll know to drop the dep entirely.

### 3. Bump the `fancy-screens` peer

`fancy-inertia` 0.2 requires `fancy-screens` 0.4+. If you're staying on 0.3.x for some reason, stay on `fancy-inertia` 0.1.x — they're paired by major.

## See also

- [fancy-screens Migration.md](https://github.com/Particle-Academy/fancy-screens/blob/main/docs/Migration.md) — the broader 0.3 → 0.4 story (Ports → Zustand)
