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

Mount once near your app root (it renders nothing until an update is detected):

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
