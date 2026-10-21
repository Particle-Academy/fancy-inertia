# App update detection

When you redeploy, users with the page already open keep running the **old**
JS/CSS bundle until they refresh — missing fixes and risking subtle mismatches
against the new backend. `useAppUpdate` / `<AppUpdateAlert>` detect a new build
and prompt a refresh.

> These are the **Inertia-flavored** wrappers around
> [`@particle-academy/fancy-app-update`](https://www.npmjs.com/package/@particle-academy/fancy-app-update)
> (the framework-agnostic core, installed for you): same hook + component, but the
> default detection uses Inertia's asset version and the default UI is a
> react-fancy Callout. Every core option (`check`, `currentVersion` +
> `latestVersion`, `pingUrl`) still works to override the Inertia default. A
> plain-React app with no Inertia can use the core package directly.

**Zero-config on Inertia.** `HandleInertiaRequests::version()` hashes your Vite
manifest, so the asset version changes on every build, and Inertia returns **409**
to a GET carrying a stale `X-Inertia-Version`. The hook polls with the loaded
version and flags an update on a 409 — **no extra endpoint, no config**.

## Drop-in component

Mount once, **inside Inertia's `<App>`** (it renders nothing until an update is
detected). The easiest way is `setupFancyApp`:

```tsx
setupFancyApp({ el, App, props, appUpdate: true });
// or the alert's props:
setupFancyApp({ el, App, props, appUpdate: { position: "bottom" } });
```

Mounting it from the `providers` slot does not work: that slot wraps the
subtree *containing* `<App>`, so `usePage()` throws. Inside a page or layout:

```tsx
import { AppUpdateAlert } from "@particle-academy/fancy-inertia";

<AppUpdateAlert />
```

By default it shows a dismissible react-fancy `Callout` (in a Portal, bottom-right)
with a **Refresh** button. Everything is customizable:

```tsx
<AppUpdateAlert
  title="We just shipped an update"
  description="Refresh to get the latest."
  refreshLabel="Reload"
  color="violet"
  position="bottom"        // bottom-right | bottom-left | top-right | top-left | bottom | top
  interval={30_000}        // poll cadence (ms); default 60_000
  onRefresh={() => router.reload()}  // customize the action (default: hard reload)
/>
```

**Replace the whole UX** with a render-prop — your own banner, modal, toast, etc.:

```tsx
import { AppUpdateAlert } from "@particle-academy/fancy-inertia";

<AppUpdateAlert
  render={({ refresh, dismiss }) => (
    <MyBanner>
      A new version is available.
      <button onClick={refresh}>Refresh</button>
      <button onClick={dismiss}>Later</button>
    </MyBanner>
  )}
/>
```

The default UI needs `@particle-academy/react-fancy` (a peer). The `render` /
`children` override does not.

## Stacked notice: say what is new

`AppUpdateStack` is fancy-app-update's stacked notice with the same Inertia
default. When a release has a message, its feature cards stack behind each
other (react-fancy's `Toast.Stack`: scroll or arrow keys walk through them),
each with a close button and a **Refresh to get the latest** action. A release
with no message (a hotfix) gets the plain refresh notice.

It lives on its own entry, so apps that never show it never load it:

```tsx
import { AppUpdateStack } from "@particle-academy/fancy-inertia/stack";

setupFancyApp({
  el, App, props,
  appUpdate: (
    <AppUpdateStack
      // cards, or a loader called ONCE, when an update is detected
      features={() => fetch("/whats-new").then((r) => r.json())}
      position="bottom-right"
    />
  ),
});
```

`appUpdate` takes the element itself, so the package root never imports the
stack. Each feature is `{ id?, title, description?, image?, imageAlt? }`;
`image` runs full width as the card's header.

Every prop is fancy-app-update's `AppUpdateStack` prop and passes straight
through: `features`, `title` / `description` / `refreshLabel` / `closeLabel`,
`color`, `position` (a corner, `top` / `bottom`, or `"inline"`), `style`,
`className`, `cardClassName`, `depth`, `offset`, `label`, `onRefresh`,
`onDismiss`, `renderFeature`, `render`, and every detector option. A `check`
(or `currentVersion` + `latestVersion`) replaces the Inertia default, as it
does everywhere else.

**Needs `@particle-academy/react-fancy` >=5.41.0** (that is where `Toast.Stack`
arrived). The package root still works on react-fancy 3 and up; only this entry
needs the newer one. On an older react-fancy it renders nothing and logs one
console error naming the version, rather than crashing the page.

## The Inertia check on its own

`useInertiaVersionCheck()` returns the Inertia detector as a `check`, so any
fancy-app-update component or hook can use it directly:

```tsx
import { useInertiaVersionCheck } from "@particle-academy/fancy-inertia";
import { AppUpdateAlert } from "@particle-academy/fancy-app-update";

function Prompt() {
  const check = useInertiaVersionCheck();      // { pingUrl } optional
  return <AppUpdateAlert check={check} />;
}
```

It resolves `true` on a 409 and `false` otherwise, including on a network
error. Like everything here it reads `usePage()`, so call it inside `<App>`.

## Headless hook

For full control, use the hook directly:

```tsx
import { useAppUpdate } from "@particle-academy/fancy-inertia";

function VersionBar() {
  const { updateAvailable, refresh, dismiss } = useAppUpdate({ interval: 30_000 });
  if (!updateAvailable) return null;
  return (
    <div className="version-bar">
      A new version is available.
      <button onClick={refresh}>Refresh</button>
      <button onClick={dismiss}>Dismiss</button>
    </div>
  );
}
```

### Options

| Option | Default | Notes |
|---|---|---|
| `enabled` | `true` | Turn detection on/off |
| `interval` | `60_000` | Poll cadence in ms |
| `pollOnFocus` | `true` | Also re-check when the tab regains focus / becomes visible |
| `pingUrl` | current path | What URL to poll |
| `check` | Inertia 409 | Custom detector → return `true` when an update is available (see below) |
| `onUpdateAvailable` | — | Fired once, when an update is first detected |

Returns `{ updateAvailable, refresh, dismiss, check }`. Polling stops once an
update is detected (or after `dismiss()`); it's fully SSR-safe (nothing runs on
the server).

### Non-Inertia hosts / a custom version source

Pass a `check` to bypass the Inertia poll — e.g. a dedicated endpoint:

```tsx
const loaded = document.querySelector('meta[name="build-id"]')?.content;
useAppUpdate({
  check: async () => {
    const live = await fetch("/build-version").then((r) => r.text());
    return live.trim() !== loaded;
  },
});
```
