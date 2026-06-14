# SSR

Inertia ships server-side rendering via `@inertiajs/server`. Some fancy components are SSR-safe; others need a client-only boundary. This page documents which — and how to wire the SSR server + hydrating client with one helper each.

## Turning SSR on (the server entry + hydrating client)

fancy-inertia ships matching helpers so the SSR server and the client mount the
**same** Fancy provider tree — no drift, no hand-written `renderToString` glue.

**1. The SSR entry — `resources/js/ssr.tsx`:**

```tsx
import { createFancyServer } from "@particle-academy/fancy-inertia/server";
import { FancyDataRoot } from "@particle-academy/fancy-query";

createFancyServer({
  resolve: (name) => {
    const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
    return pages[`./Pages/${name}.tsx`];
  },
  // App-specific providers wrap the page outlet (inside FancyAppRoot):
  providers: (outlet) => <FancyDataRoot echo={null}>{outlet}</FancyDataRoot>,
});
```

**2. The client entry — switch the body to `setupFancyApp`:**

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { setupFancyApp } from "@particle-academy/fancy-inertia";
import { FancyDataRoot } from "@particle-academy/fancy-query";

createInertiaApp({
  resolve,
  setup: ({ App, props, el }) =>
    setupFancyApp({
      el, App, props,
      providers: (outlet) => <FancyDataRoot echo={null}>{outlet}</FancyDataRoot>,
    }),
});
```

`setupFancyApp` **auto-detects** SSR: it calls `hydrateRoot` when the mount element
already has server-rendered children, else `createRoot`. So flipping Inertia SSR
on/off is a config change, not a code change. (Force it with `hydrate: true|false`.)

Both helpers accept the same `appRoot` (forwarded to `<FancyAppRoot>`) and
`transition` options; the page-layout + `<FancyPageTransition>` wiring is shared
via `buildFancyAppTree`.

**3. Laravel side:** build the SSR bundle (`vite build --ssr`) and run the renderer:

```bash
php artisan inertia:start-ssr   # dev: alongside your web server
```

On a server, run it as a long-lived process (e.g. supervisor) and set
`INERTIA_SSR_ENABLED=true`. `config('inertia.ssr.url')` must match the
`createFancyServer({ port })` (default `13714`).

> The SSR bundle imports `@particle-academy/fancy-inertia/server`, which pulls in
> `react-dom/server` — a **server-only** entry. Never import `/server` from client code.

---

Inertia 1.x ships server-side rendering via `@inertiajs/server`. Some fancy components are SSR-safe; others need a client-only boundary. This page documents which.

## Quick rule

- **`react-fancy`** — SSR-safe. Use freely.
- **Anything that touches `window`, `document.createElement('canvas')`, `IntersectionObserver`, or Babylon** — wrap in `<FancyClientOnly>`.

## Per-package matrix

### `@particle-academy/react-fancy`

| Component | SSR-safe? | Notes |
|-----------|-----------|-------|
| Card, Button, Badge, Heading, Text, Avatar, Profile | ✅ | Pure presentational |
| Input, Select, Textarea, Switch, Checkbox, Slider, RadioGroup | ✅ | Form fields render fine on the server |
| Modal, Popover, Tooltip, Dropdown, ContextMenu | ⚠️ | Render the **trigger** server-side; the **content** mounts client-side via portals (no manual wrapping needed — react-fancy guards internally) |
| Toast.Provider | ✅ | Provider mounts server-side; toasts only fire client-side |
| Tabs, Accordion, Carousel | ✅ | Content renders; interactive state activates on hydration |
| Calendar, DatePicker, TimePicker | ✅ | |
| Editor, Composer | ⚠️ | The content tree renders, but rich-text plugins activate client-side |
| Code editor (FancyCode integration), file upload | ❌ | **Wrap in `<FancyClientOnly>`** — these mount their own browser-only runtimes |

### `@particle-academy/fancy-echarts`

| Component | SSR-safe? |
|-----------|-----------|
| `<EChart>` | ❌ — wrap in `<FancyClientOnly>` |
| `<EChart3D>` | ❌ — needs WebGL |
| `<EChartGraphic>` | ❌ — same as `<EChart>` |
| Diagram presets (`<DataDiagram>`, `<Flowchart>`, `<Mindmap>`, `<OrgChart>`) | ❌ — depend on layout measurement |
| `registerAll`, `registerCharts`, theme registration | ✅ — pure JS module work |

`<FancyAppRoot withECharts>` calls `registerAll()` lazily on the client only — safe on the server.

### `@particle-academy/fancy-screens`

| Component | SSR-safe? | Notes |
|-----------|-----------|-------|
| `<Screen.System>` | ✅ | Provider only — no observers run during SSR |
| `<Screen>` | ⚠️ | The component tree renders, but `IntersectionObserver` only attaches client-side. Hibernation features start working post-hydration. **No `<FancyClientOnly>` wrapper needed**, but lifecycle is `mounting → active` only on the server. |
| `<Screen.Body>`, `<Screen.Port>` | ✅ | Pure declarative |
| `useScreenPort()`, `useScreens()`, `useScreen()` | ✅ | Run the same on server + client; on the server they observe the static initial port state |
| `<Screen.Loading>` | ✅ | Renders the skeleton on the server when ports start as `loading: true` (0.4.x) |
| Schema-mode `<Screen schema={...} />` | ✅ | Renders schema → React tree server-side; lifecycle activates client-side |

`usePersistFancyState()` is a no-op on the server (no `window`, no `router.on`).

### `@particle-academy/fancy-3d`

| Component | SSR-safe? |
|-----------|-----------|
| `<Stage>`, `<Monitor>`, `<Card3D>`, `<Decal>` | ❌ — Babylon needs `window` |
| `<Canvas engine="dom">` | ⚠️ — node tree renders; pan/zoom + engines activate client-side |
| `<Canvas engine="babylon">` | ❌ — wrap in `<FancyClientOnly>` |

### `@particle-academy/fancy-code`, `@particle-academy/fancy-sheets`

| Component | SSR-safe? |
|-----------|-----------|
| Editor / Spreadsheet root | ❌ — wrap in `<FancyClientOnly>`. Both mount their own canvas/DOM observers and grid measurement runs. |

## Patterns

### Bare client-only wrapper

```tsx
import { FancyClientOnly } from "@particle-academy/fancy-inertia";

<FancyClientOnly>
  <EChart option={option} />
</FancyClientOnly>
```

### With a sized fallback

The fallback IS the SSR HTML. Make it match the eventual height to avoid layout shift on hydration:

```tsx
<FancyClientOnly
  fallback={<div className="h-96 w-full animate-pulse rounded bg-zinc-100" />}
>
  <EChart option={option} style={{ height: 384 }} />
</FancyClientOnly>
```

### Pre-render the static parts, lazy the dynamic

For complex pages, render the static skeleton on the server and only the canvas client-side:

```tsx
export default function Page({ stats }) {
  return (
    <Card>
      <Card.Header>
        <h1>Q4 Stats</h1>           {/* SSR — text indexable */}
        <p>{stats.summary}</p>       {/* SSR */}
      </Card.Header>
      <Card.Body>
        <FancyClientOnly fallback={<div className="h-80 animate-pulse rounded bg-zinc-100" />}>
          <EChart option={buildOption(stats)} />
        </FancyClientOnly>
      </Card.Body>
    </Card>
  );
}
```

The card frame, header text, and summary are in the SSR payload — search engines and slow-network first paint see them immediately. The chart canvas mounts after hydration.

### Conditional SSR via env check

If you don't want to use `<FancyClientOnly>` for some reason, the bare guard works:

```tsx
{typeof window !== "undefined" && <EChart option={option} />}
```

This is what `<FancyClientOnly>` does internally, plus a `mounted` state to avoid hydration mismatches.

## Common errors

### `ReferenceError: window is not defined`

The component tried to read `window` during the SSR render. Wrap in `<FancyClientOnly>`.

### `Hydration failed because the initial UI does not match what was rendered on the server`

The server rendered something different from the client's first paint. Common causes:
- A component that renders different content based on `window.matchMedia` (dark mode detection, etc.)
- A `Math.random()` or `Date.now()` in render

Fix: move dynamic logic into `useEffect` (post-mount), or wrap the dynamic component in `<FancyClientOnly>`.

### `Cannot read properties of undefined (reading 'registerCharts')` during SSR

Echarts module registration ran on the server. Use `<FancyAppRoot withECharts>` (it gates registration to client-side) or call `registerAll()` from a `useEffect` instead of at module top-level.
