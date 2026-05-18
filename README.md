# @particle-academy/fancy-inertia

**Inertia.js integration for the fancy UI set.** Bridges the friction between the fancy packages (`react-fancy`, `fancy-echarts`, `fancy-screens`, …) and an Inertia-powered Laravel app: app-shell providers, SSR-safe boundaries, a useForm bridge, and schema-driven page rendering.

## Why this exists

Inertia is "just" a router that mounts React components, so individual fancy components work inside Inertia pages without changes. But the *runtime* layers — toast queue, modal portal, screen registry, echarts module registry — are app-shell concerns that live ABOVE the Inertia outlet, not inside individual pages. `fancy-inertia` is that bridge.

## Installation

```bash
npm install @particle-academy/fancy-inertia
```

**Peer dependencies:**
- `react >= 18`, `react-dom >= 18`
- `@inertiajs/react >= 1`
- `@particle-academy/react-fancy >= 3` — `<FancyAppRoot>` mounts `Toast.Provider`
- `@particle-academy/fancy-screens >= 0.4` (optional) — `<InertiaSchemaScreen>` and the `withScreens` flag
- `@particle-academy/fancy-echarts >= 3` (optional) — the `withECharts` flag

## Quick start

Wire `<FancyAppRoot>` into your Inertia app entry once. It mounts `Toast.Provider`, `Screen.System`, and registers echarts modules:

```tsx
// resources/js/app.tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { FancyAppRoot } from "@particle-academy/fancy-inertia";

createInertiaApp({
  resolve: (name) => import(`./Pages/${name}.tsx`),
  setup({ App, props, el }) {
    createRoot(el).render(
      <FancyAppRoot>
        <App {...props} />
      </FancyAppRoot>,
    );
  },
});
```

Every page below now has Toast / Screen.System / echarts registered.

## What's inside

| Export | Solves |
|--------|--------|
| `<FancyAppRoot>` | App-shell providers in one wrapper — Toast, Screen.System, echarts module registration |
| `<FancyClientOnly>` | Skip-SSR boundary for components that touch `window` (echarts, fancy-3d, IntersectionObserver) |
| `useFancyForm()` | Inertia `useForm()` wrapper with a `field(name)` helper that drops directly into react-fancy's `<Input>`, `<Select>`, `<Switch>`, etc. |
| `registerFancyComponents()` | Pre-registers a curated component whitelist for fancy-screens schema mode |
| `<InertiaSchemaScreen>` | One-liner page that renders `<Screen schema={page.props.schema} />` — turns a Laravel controller into the source of truth for an entire page layout |

See [docs/USAGE.md](docs/USAGE.md) for full examples and [docs/Recipes.md](docs/Recipes.md) for end-to-end patterns.

## The schema-driven Inertia pattern

The most powerful integration — agent-emitted JSON UI rendered through Inertia:

```php
// PHP — controller
return Inertia::render('AgentScreen', [
    'schema' => app(AgentService::class)->buildPageFor($user),
]);
```

```tsx
// React — page component
import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
export default () => <InertiaSchemaScreen />;
```

Combined with Inertia's partial reloads, the server can swap the schema without remounting the page — components diff in place. This is the LLM-friendly server → client → fancy pipeline that no other React UI kit ships out of the box.

## State persistence across navigation

`fancy-screens` 0.4+ uses Zustand for screen state, and Zustand stores survive Inertia navigation (they're module-scope JS objects, not React state). For full-page-refresh persistence, use Zustand's `persist` middleware directly:

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

`fancy-inertia` 0.1.x shipped a `usePersistFancyState` hook for the old Port system; that hook is **removed** in 0.2.x — see [docs/Migration.md](docs/Migration.md).

## Documentation

| Topic | Description |
|-------|-------------|
| [USAGE.md](docs/USAGE.md) | Full reference for every export with examples |
| [Recipes.md](docs/Recipes.md) | End-to-end patterns: forms, schema-driven pages |
| [SSR.md](docs/SSR.md) | Inertia SSR compatibility matrix per fancy package |
| [Migration.md](docs/Migration.md) | 0.1.x → 0.2.x: drop `usePersistFancyState`, static FancyAppRoot |

## License

MIT
