# USAGE

Full reference for every export in `@particle-academy/fancy-inertia`.

## Table of contents

- [`<FancyAppRoot>`](#fancyapproot) — composite app-shell provider
- [`<FancyClientOnly>`](#fancyclientonly) — skip-SSR boundary
- [`useFancyForm()`](#usefancyform) — react-fancy ↔ Inertia useForm bridge
- [`usePersistFancyState()`](#usepersistfancystate) — fancy-screens persistence across navigation
- [`registerFancyComponents()`](#registerfancycomponents) — schema-mode component whitelist
- [`<InertiaSchemaScreen>`](#inertiaschemascreen) — page-prop-driven schema rendering

---

## `<FancyAppRoot>`

Wrap your Inertia app entry once. Mounts every fancy app-shell provider so individual pages don't have to.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Your app tree (typically the Inertia `<App />`). |
| `toastPosition` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | `"bottom-right"` | Position passed to react-fancy's `Toast.Provider`. |
| `withScreens` | `boolean` | `true` | Mount `<Screen.System>` from fancy-screens. Set false to skip if your app doesn't use fancy-screens. |
| `withECharts` | `boolean` | `true` | Auto-call `registerAll()` + `registerBuiltinThemes()` from fancy-echarts. Disable for tree-shake control. |

### Example

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { FancyAppRoot } from "@particle-academy/fancy-inertia";

createInertiaApp({
  resolve: (name) => import(`./Pages/${name}.tsx`),
  setup({ App, props, el }) {
    createRoot(el).render(
      <FancyAppRoot toastPosition="top-right">
        <App {...props} />
      </FancyAppRoot>
    );
  },
});
```

### Notes

- The optional fancy-echarts and fancy-screens dependencies are dynamic-imported. If a peer is missing, the corresponding feature silently no-ops (with a `console.warn`). Pages using only `react-fancy` will run fine without those installed.
- `Toast.Provider` is unconditional because `react-fancy` is always required and toasts are useful in nearly every app.

---

## `<FancyClientOnly>`

Skip-SSR boundary. Renders `fallback` during the server render and the first client paint, then swaps in `children`. Required around components that touch browser-only globals.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | The browser-only subtree. |
| `fallback` | `ReactNode` | `null` | Rendered while waiting for client hydration. Pass a skeleton for a better UX. |

### Example

```tsx
import { FancyClientOnly } from "@particle-academy/fancy-inertia";
import { EChart } from "@particle-academy/fancy-echarts";

export default function Dashboard() {
  return (
    <FancyClientOnly fallback={<div className="h-96 animate-pulse rounded bg-zinc-100" />}>
      <EChart option={chartOption} />
    </FancyClientOnly>
  );
}
```

### When to use

| Component | Needs `<FancyClientOnly>`? |
|-----------|---------------------------|
| `react-fancy` (Card, Button, Input, Modal, ...) | No — SSR-safe |
| `fancy-echarts` charts (`<EChart>`, `<EChart3D>`) | **Yes** — initialization needs `window` |
| `fancy-3d` (`<Stage>`, `<Monitor>`, `<Card3D>`) | **Yes** — Babylon needs `window` |
| `fancy-screens` (`<Screen>`) | **Yes** when used inline in a page (uses IntersectionObserver). No when mounted via `<FancyAppRoot withScreens>` (provider is SSR-safe; the visibility hooks only fire post-mount). |
| `fancy-code`, `fancy-sheets` | **Yes** — editors mount their own canvas/DOM observers |

See [docs/SSR.md](./SSR.md) for the full per-package matrix.

---

## `useFancyForm()`

Wraps Inertia's `useForm()` so each react-fancy field can be wired in one line via `form.field(name)`.

### Signature

```ts
function useFancyForm<TData>(
  initialOrForm: TData | InertiaForm<TData>
): FancyFormBridge<TData>;
```

You can pass either:
- **Initial values** — the hook calls `useForm()` for you internally
- **An existing Inertia useForm result** — use this to compose with library-managed forms or do extra wiring before handing off to fancy

### `field(name)`

Returns props ready to spread into a react-fancy input:

```ts
type FancyFieldBridge<T> = {
  value: T;
  onChange: (e: React.ChangeEvent | T) => void;   // accepts events OR raw values
  error?: string;                                  // server-side validation error
  loading?: boolean;                               // mirrors form.processing
  name: string;
};
```

### Example

```tsx
import { useFancyForm } from "@particle-academy/fancy-inertia";
import { Input, Switch, Button } from "@particle-academy/react-fancy";

export default function ProfileForm() {
  const form = useFancyForm({
    name: "",
    email: "",
    notify: false,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.post("/profile"); }}>
      <Input {...form.field("name")} placeholder="Name" />
      <Input {...form.field("email")} placeholder="Email" type="email" />
      <Switch {...form.field("notify")} />
      <Button type="submit" loading={form.processing}>Save</Button>
    </form>
  );
}
```

The same `field("name")` props work for `<Input>` (event-based), `<Switch>` (raw value), `<Select>` (raw value), `<Textarea>`, `<Checkbox>` — the bridge auto-detects whether `onChange` was called with a React event or a raw value.

### Composing with externally-managed `useForm()`

If you've already called `useForm()` (e.g. to set up validation rules or transform data), pass the result through:

```tsx
import { useForm } from "@inertiajs/react";

const inertiaForm = useForm({ name: "", email: "" });
const fancy = useFancyForm(inertiaForm);
```

---

## `usePersistFancyState()`

Hook that bridges fancy-screens' port store with Inertia's navigation lifecycle. Without it, every `router.visit()` call drops the entire port store and screen registry on the floor — the agent-introspection superpower vanishes the moment the user clicks a link.

### Signature

```ts
function usePersistFancyState(options?: {
  storage?: "session" | "local";   // default: "session"
  key?: string;                     // default: "fancy-screens:persist"
  enabled?: boolean;                // default: true
}): void;
```

### Example

Mount once at app-shell level — typically alongside `<FancyAppRoot>`:

```tsx
import { FancyAppRoot, usePersistFancyState } from "@particle-academy/fancy-inertia";

function ShellInner({ children }: { children: React.ReactNode }) {
  usePersistFancyState();
  return <>{children}</>;
}

createInertiaApp({
  setup({ App, props, el }) {
    createRoot(el).render(
      <FancyAppRoot>
        <ShellInner>
          <App {...props} />
        </ShellInner>
      </FancyAppRoot>
    );
  },
});
```

### What's persisted

- Port state map (every `screenId.portName` → `{ value, loading, error, version }`)
- (0.3.x+) Scroll positions per screen
- (0.3.x+) Focus key per screen

What's NOT persisted: arbitrary `useState` inside a screen's components — that's intentional, fancy-screens encourages persistent state to live in declared ports.

### Storage choice

- `session` (default) — clears when the tab closes. Fits "preserve across navigation, not across browser sessions."
- `local` — survives tab close. Use for multi-window apps where users expect their last view to come back tomorrow.

---

## `registerFancyComponents()`

Pre-registers a curated component whitelist for fancy-screens' schema-driven mode. Server-supplied schemas can then reference any component by name without per-page registration.

### Signature

```ts
async function registerFancyComponents(options?: {
  withECharts?: boolean;     // include <EChart> + diagram presets
  withScreens?: boolean;     // include <Screen> primitive
  extra?: Record<string, ComponentType>;   // your app components
}): Promise<ComponentRegistry>;
```

### Example

```tsx
import { registerFancyComponents } from "@particle-academy/fancy-inertia";
import { Screen } from "@particle-academy/fancy-screens";

const registry = await registerFancyComponents({
  withECharts: true,
  withScreens: true,
  extra: {
    MyChart,
    MyOnboardingCard,
  },
});

if (typeof Screen.registerComponents === "function") {
  Screen.registerComponents(registry);
}
```

### Default whitelist

`react-fancy`: `Card`, `Button`, `Badge`, `Heading`, `Text`, `Input`, `Select`, `Textarea`, `Switch`, `Checkbox`, `Modal`, `Callout`, `Tabs`, `Accordion`, `Avatar`, `Profile`, `Timeline`, `Tooltip`, `Popover`

With `withECharts: true`: + `EChart`, `EChart3D`, `DataDiagram`, `Flowchart`, `Mindmap`, `OrgChart`

With `withScreens: true`: + `Screen`

The whitelist is intentionally minimal to keep agent-supplied schemas safe and bundles small. Use `extra` to register app-specific components.

---

## `<InertiaSchemaScreen>`

Sugar over `<Screen schema={...} />` that pulls the schema directly from `usePage().props`. Lets a Laravel controller render an entire page with one return.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `propKey` | `string` | `"schema"` | Inertia page-prop key holding the schema. |
| `fallback` | `ReactNode` | `null` | Rendered while fancy-screens loads or if the prop is missing. |

### Example

```php
// Laravel controller
public function dashboard(User $user) {
    return Inertia::render('AgentScreen', [
        'schema' => app(AgentService::class)->dashboardFor($user),
    ]);
}
```

```tsx
// React page — entire file
import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
export default function AgentScreen() {
  return <InertiaSchemaScreen />;
}
```

### Multiple schema-shapes per app

Pass a different `propKey` for pages with their own shape:

```tsx
<InertiaSchemaScreen propKey="layout" />
```

```php
return Inertia::render('LayoutDriven', ['layout' => $layout]);
```

### See also

- [Recipes.md → Schema-driven pages](./Recipes.md#schema-driven-pages) for the full controller + page + agent pipeline
- fancy-screens [docs/Schema.md](https://github.com/Particle-Academy/fancy-screens/blob/main/docs/Schema.md) for the schema shape itself
