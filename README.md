# @particle-academy/fancy-inertia

**Inertia.js integration for the fancy UI set.** Bridges every friction point between the fancy packages (`react-fancy`, `fancy-echarts`, `fancy-screens`, `fancy-3d`, `fancy-code`, `fancy-sheets`) and an Inertia-powered Laravel app: app-shell providers, SSR-safe boundaries, useForm bridge, schema-driven page rendering, and persistence of fancy-screens state across Inertia navigation.

## Why this exists

Inertia is "just" a router that mounts React components, so individual fancy components work inside Inertia pages without changes. But the *runtime* layers — toast queue, modal portal, screen registry, port store, echarts module registry — are app-shell concerns that need to live ABOVE the Inertia outlet, not inside individual pages. And Inertia's full-page navigation behavior (mount/unmount on `router.visit`) breaks fancy-screens' long-lived state model unless someone bridges the two.

`fancy-inertia` is that bridge. ~400 LoC, six exports, zero invasive changes to the underlying packages.

## Installation

```bash
npm install @particle-academy/fancy-inertia
```

**Peer dependencies:**
- `react >= 18`, `react-dom >= 18`
- `@inertiajs/react >= 1` *(required if you use any of the Inertia-aware exports)*
- `@particle-academy/react-fancy >= 3` *(required — `<FancyAppRoot>` mounts `Toast.Provider`)*
- `@particle-academy/fancy-screens >= 0.2` *(optional — required for `<InertiaSchemaScreen>` + `usePersistFancyState` + `withScreens` flag)*
- `@particle-academy/fancy-echarts >= 3` *(optional — required for `withECharts` registration)*

The optional peers are dynamic-imported, so install only what your app actually uses.

## Quick start

Wire `<FancyAppRoot>` into your Inertia app entry once. It mounts `Toast.Provider`, `Screen.System`, and registers echarts modules — every page below it gets the providers for free:

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
      </FancyAppRoot>
    );
  },
});
```

That's it. Every page now has Toast / Screen.System / echarts registered without page-level boilerplate.

## What's inside

| Export | Solves |
|--------|--------|
| `<FancyAppRoot>` | App-shell providers in one wrapper — Toast, Screen.System, echarts module registration |
| `<FancyClientOnly>` | Skip-SSR boundary for components that touch `window` (echarts, fancy-3d, IntersectionObserver) |
| `useFancyForm()` | Inertia `useForm()` wrapper with a `field(name)` helper that drops directly into react-fancy's `<Input>`, `<Select>`, `<Switch>`, etc. |
| `usePersistFancyState()` | Persists fancy-screens port store across Inertia navigations (without it, the screen registry vanishes on every page swap) |
| `registerFancyComponents()` | Pre-registers a curated component whitelist for fancy-screens schema mode |
| `<InertiaSchemaScreen>` | One-liner page that renders `<Screen schema={page.props.schema} />` — turns a Laravel controller into the source of truth for an entire page layout |

See [docs/USAGE.md](docs/USAGE.md) for full examples of each, [docs/Recipes.md](docs/Recipes.md) for end-to-end patterns, and [docs/SSR.md](docs/SSR.md) for the SSR compatibility matrix.

## The schema-driven Inertia pattern

The most powerful integration. A Laravel controller emits a fancy-screens schema as a regular Inertia prop; the React page is one line:

```php
// PHP — controller
return Inertia::render('AgentScreen', [
    'schema' => app(AgentService::class)->dashboardFor($user),
]);
```

```tsx
// React — page component
import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
export default () => <InertiaSchemaScreen />;
```

Combined with Inertia's partial reloads, the server can swap the schema without remounting the page — the rendered components diff in place. This is the LLM-friendly server → client → fancy pipeline that no other React UI kit ships out of the box. See [docs/Recipes.md](docs/Recipes.md#schema-driven-pages) for a full controller + page example.

## Documentation

| Topic | Description |
|-------|-------------|
| [USAGE.md](docs/USAGE.md) | Full reference for every export with examples |
| [Recipes.md](docs/Recipes.md) | End-to-end patterns: forms, schema-driven pages, persisted screens |
| [SSR.md](docs/SSR.md) | Inertia SSR compatibility matrix per fancy package + skip-SSR patterns |

## License

MIT
