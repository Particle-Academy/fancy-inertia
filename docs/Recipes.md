# Recipes

End-to-end patterns combining `fancy-inertia` with the rest of the fancy stack.

## Table of contents

- [App-shell setup (Laravel + Inertia + fancy)](#app-shell-setup-laravel--inertia--fancy)
- [Schema-driven pages](#schema-driven-pages)
- [Persisted multi-screen dashboard across navigations](#persisted-multi-screen-dashboard-across-navigations)
- [Server-validated forms with react-fancy fields](#server-validated-forms-with-react-fancy-fields)
- [SSR-safe charts in an Inertia page](#ssr-safe-charts-in-an-inertia-page)
- [Cross-screen state on a multi-Inertia-page admin](#cross-screen-state-on-a-multi-inertia-page-admin)

---

## App-shell setup (Laravel + Inertia + fancy)

The minimum viable bootstrap. Drops every fancy provider above the Inertia outlet and wires component pre-registration for schema mode.

```tsx
// resources/js/app.tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import {
  FancyAppRoot,
  registerFancyComponents,
  usePersistFancyState,
} from "@particle-academy/fancy-inertia";
import { Screen } from "@particle-academy/fancy-screens";

// One-time component registry (runs before the React tree mounts).
registerFancyComponents({ withECharts: true, withScreens: true }).then((registry) => {
  if (typeof Screen.registerComponents === "function") {
    Screen.registerComponents(registry);
  }
});

function ShellInner({ children }: { children: React.ReactNode }) {
  // Persist fancy-screens state across Inertia visits.
  usePersistFancyState();
  return <>{children}</>;
}

createInertiaApp({
  resolve: (name) => import(`./Pages/${name}.tsx`),
  setup({ App, props, el }) {
    createRoot(el).render(
      <FancyAppRoot toastPosition="top-right">
        <ShellInner>
          <App {...props} />
        </ShellInner>
      </FancyAppRoot>
    );
  },
});
```

```css
/* resources/css/app.css */
@import "tailwindcss";
@source "../node_modules/@particle-academy/react-fancy/dist/**/*.js";
@source "../node_modules/@particle-academy/fancy-screens/dist/**/*.js";
```

Now any page can use any react-fancy / fancy-screens / fancy-echarts component without provider boilerplate.

---

## Schema-driven pages

The killer combo. A controller writes a fancy-screens schema; the React page is one line.

### Step 1 — Generate schema in PHP

```php
// app/Services/AgentService.php
class AgentService
{
    public function dashboardFor(User $user): array
    {
        return [
            'id' => "user-dashboard-{$user->id}",
            'title' => "Welcome back, {$user->name}",
            'ports' => [
                'user' => ['in' => ['kind' => 'object', 'shape' => ['name' => 'string']]],
            ],
            'layout' => [
                'type' => 'grid',
                'cols' => 12,
                'children' => [
                    [
                        'col' => 8,
                        'component' => 'EChart',
                        'props' => [
                            'option' => $this->buildRevenueChart($user),
                        ],
                    ],
                    [
                        'col' => 4,
                        'component' => 'Card',
                        'props' => ['title' => 'Status'],
                        'children' => [
                            ['component' => 'Badge', 'props' => ['color' => 'green'], 'children' => ['Healthy']],
                        ],
                    ],
                ],
            ],
        ];
    }
}
```

### Step 2 — Controller passes schema as prop

```php
// app/Http/Controllers/DashboardController.php
class DashboardController
{
    public function __invoke(Request $request, AgentService $agent)
    {
        return Inertia::render('AgentDashboard', [
            'schema' => $agent->dashboardFor($request->user()),
        ]);
    }
}
```

### Step 3 — React page is one line

```tsx
// resources/js/Pages/AgentDashboard.tsx
import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
export default function AgentDashboard() {
  return <InertiaSchemaScreen />;
}
```

### Live updates without remount

Use Inertia's [partial reload](https://inertiajs.com/partial-reloads) to swap just the schema:

```tsx
import { router } from "@inertiajs/react";

// Refresh the schema without losing port state
router.reload({ only: ["schema"] });
```

The new schema diffs into the existing render — port state survives because the Screen component reuses its own port store.

---

## Persisted multi-screen dashboard across navigations

A common Inertia admin: each "section" (Reports, Users, Settings) is its own Inertia page, but a global `<Screen.Spotlight>` (in fancy-screens 0.5.x) layers above them showing one large + thumbnails. Without persistence, navigating between sections would reset the spotlight every time.

```tsx
// resources/js/app.tsx
import { usePersistFancyState } from "@particle-academy/fancy-inertia";

function ShellInner({ children }) {
  usePersistFancyState({ storage: "local" });   // survive tab close
  return <>{children}</>;
}
```

Now the spotlight remembers which screen was active, what port values were set, and what the user was looking at — even after navigating to a fresh Inertia page or reloading the tab.

---

## Server-validated forms with react-fancy fields

Inertia's `useForm()` returns server-side validation errors after a failed POST. `useFancyForm` wires those errors directly into react-fancy's `<Input error={...}>` slot.

```tsx
import { useFancyForm } from "@particle-academy/fancy-inertia";
import { Input, Textarea, Button } from "@particle-academy/react-fancy";

export default function ContactForm() {
  const form = useFancyForm({
    email: "",
    subject: "",
    body: "",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.post("/contact"); }}>
      <Input {...form.field("email")} type="email" placeholder="Email" />
      <Input {...form.field("subject")} placeholder="Subject" />
      <Textarea {...form.field("body")} rows={6} />
      <Button type="submit" loading={form.processing}>Send</Button>
    </form>
  );
}
```

```php
// Laravel controller
public function store(Request $request) {
    $validated = $request->validate([
        'email' => 'required|email',
        'subject' => 'required|min:3',
        'body' => 'required|min:10',
    ]);
    Mail::to('hello@example.com')->send(new ContactMessage($validated));
    return back()->with('success', 'Message sent.');
}
```

When validation fails, every `<Input>` gets the matching error message via `form.field(name).error` automatically.

---

## SSR-safe charts in an Inertia page

If your Inertia app has SSR enabled (`@inertiajs/server` or Laravel's `inertia:start-ssr`), fancy-echarts charts will throw on the SSR render pass because they need `window`. Wrap them:

```tsx
import { FancyClientOnly } from "@particle-academy/fancy-inertia";
import { EChart } from "@particle-academy/fancy-echarts";

export default function Stats({ stats }) {
  return (
    <div>
      <h1>Stats</h1>
      <FancyClientOnly fallback={<div className="h-80 animate-pulse rounded bg-zinc-100" />}>
        <EChart option={buildOption(stats)} style={{ height: 320 }} />
      </FancyClientOnly>
    </div>
  );
}
```

The fallback is what the SSR HTML contains. Real chart mounts after hydration. No flicker if the fallback dimensions match the chart.

---

## Cross-screen state on a multi-Inertia-page admin

Suppose `/admin/users` and `/admin/reports` are separate Inertia pages, but both embed a `<Screen id="filters">` whose `dateRange` port is shared. With `usePersistFancyState`, navigating between the two pages preserves the filter:

```tsx
// Pages/Admin/Users.tsx
import { Screen, useScreenPort } from "@particle-academy/fancy-screens";

export default function Users() {
  return (
    <Screen id="filters" title="Filters">
      <Screen.Port name="dateRange" defaultValue={{ start: null, end: null }} />
      <Screen.Body>
        <DateRangePicker />
        <UsersTable />
      </Screen.Body>
    </Screen>
  );
}

function DateRangePicker() {
  const [range, setRange] = useScreenPort<{ start; end }>("dateRange");
  return <Calendar value={range} onChange={setRange} />;
}
```

Click into `/admin/reports`:

```tsx
// Pages/Admin/Reports.tsx
import { Screen, useScreenPort } from "@particle-academy/fancy-screens";

export default function Reports() {
  return (
    <Screen id="filters" title="Filters">
      <Screen.Port name="dateRange" />
      <Screen.Body>
        <ReportSection />
      </Screen.Body>
    </Screen>
  );
}

function ReportSection() {
  const [range] = useScreenPort<{ start; end }>("dateRange");
  // `range` is whatever the user set on /admin/users — restored from sessionStorage
  return <Report from={range.start} to={range.end} />;
}
```

The shared `screenId="filters"` + matching port name `"dateRange"` + `usePersistFancyState()` is all it takes. No global Redux, no URL params, no parent-component prop drilling.
