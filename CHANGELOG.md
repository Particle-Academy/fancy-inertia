# Changelog

## [Unreleased]

## [0.9.6] — 2026-07-31

### Security

- **Fixed two high-severity ReDoS vulnerabilities in `<Seo>`** (CodeQL
  `js/polynomial-redos`, alerts #1 and #2).

  `buildCanonical` and `absoluteImage` trimmed slashes with `/\/+$/` and
  `/^\/+/`. A quantifier anchored at one end is retried from every start
  position, so a value carrying a long run of slashes costs time **quadratic in
  its length**. Measured on the fix's own regression test: a 50,000-slash path
  took **1.7s and 2.3s** through those two paths, against sub-millisecond now.

  **This runs on every page render of every consuming app**, over a `siteUrl`
  from host config and a `url` from the current route — neither of which the
  component gets to vouch for. Both now use a linear character scan that cannot
  backtrack at all.

  **Upgrade, and do nothing else.** Behaviour is identical for every input:
  same canonical, same absolute image, same handling of repeated slashes at
  either end. There is no API change and no configuration to review.

  The regression test asserts a timing bound as well as correctness, because
  correctness alone passes against the vulnerable version too. It fails against
  0.9.5, which is the only reason to trust it.

## [0.9.5] — 2026-07-30

### Fixed

- **`setupFancyApp` now accepts Inertia 3's real `App` component and bootstrap
  props types.** The prior structural type added a string index signature and
  made `children` optional, which is narrower than Inertia 3.6's
  `InertiaAppProps`. A correctly typed `createInertiaApp({ setup })` therefore
  failed `tsc` even though the runtime integration was valid.

  **No application change is required.** The runtime code and public call shape
  are unchanged; this widens only the TypeScript integration boundary so each
  supported Inertia major can supply its adapter-owned bootstrap props.

## [0.9.4] — 2026-07-30

### Fixed

- **`useFancyForm` called a hook inside `useMemo`, unmounting the page on the
  first state update.** The Inertia `useForm` shim was invoked inside a `useMemo`
  keyed on `initialOrForm`, so it ran only when that memo recomputed. Pass a
  **stable** reference — a module-level constant, or anything memoised — and the
  memo is cached from the second render on, the inner hooks are skipped, React's
  hook order desyncs, and the next render dies with `Cannot read properties of
  undefined (reading 'length')` from deep inside React. The page unmounts to a
  white screen and the error names none of the responsible code.

  **It hid well, and the tidier your code the more likely you hit it.** Every
  call site passing an inline object literal gets a new reference each render, so
  the memo always recomputes and the hooks always run. Only callers who hoist
  initial values to a constant were affected — 2 of 10 call sites in the app that
  found it. It also survives page load and only dies on the first state update,
  so it presents as a click-handler bug rather than a hook bug.

  The shim is now called unconditionally at the top level, with a stable
  module-level `EMPTY_INITIAL` when the caller supplied their own form. That
  costs one idle Inertia form in that case, which is the right trade against a
  conditional hook.

  **No action needed** — the API is unchanged and the fix is internal.

  The `eslint-disable` on that line silenced `exhaustive-deps`; the actual
  violation was `rules-of-hooks`, which had never run because this repo had no
  ESLint at all. It does now, and it is what makes this class of bug reportable.

### Fixed

- **`<Seo>` duplicated every tag the server baseline had already rendered,
  instead of replacing them.** Pages served two `<meta name="description">` with
  different text, plus doubled `og:*` and `twitter:*`. Confirmed live on the
  showcase: 13 duplicated tags on a single page.

  `head-key` is Inertia's convention *inside* `<Head>` — Inertia rewrites it to
  `data-inertia` and dedupes on that. A `head-key` in a **Blade** template
  (`particle-academy/fancy-seo`'s `<x-fancy-seo::head>`) is rewritten by nothing,
  so Inertia's head manager cannot see it: `isInertiaManagedElement` tests for
  `data-inertia` and nothing else. Every tag `<Seo>` emitted was appended beside
  the server's copy. **Both packages documented a dedup that never happened.**

  `<Seo>` now removes the baseline's copies of the keys it emits, once, on the
  client. It removes **only** those keys — a baseline tag `<Seo>` does not
  provide (a route-specific `keywords`, say) is left alone, because the server
  knows things the client defaults do not. Inertia's own `data-inertia` elements
  are never touched.

  **No action needed** if you use `<Seo>` with the fancy-seo Blade baseline —
  this is the behaviour that was already documented. If you were working around
  the duplication by stripping tags yourself, you can stop.

  **Not fixed by putting `data-inertia` on the Blade tags**, which is the obvious
  one-line change and is worse: Inertia *deletes* what it manages, removing every
  `data-inertia` element the current page does not re-emit. A tagged baseline
  survives only on pages rendering a matching `<Seo>` — on any page with some
  other `<Head>` and no `<Seo>`, the entire server-rendered head is silently
  deleted after hydration. That is 109 of 305 pages on the showcase. Duplicated
  tags traded for missing ones is not a fix.

### Changed

- Widened the `@particle-academy/fancy-app-update` requirement from `^0.1.0` to `>=0.1 <2.0`, so a
  sibling minor release is an upgrade and not a resolver conflict. **No action
  needed** — widening a range only adds candidates; the version you have today
  still resolves.

  A caret on a `0.x` range locks the MINOR, so this pinned a sibling at
  whatever it happened to be on the day it was written, and each sibling
  release then read as a conflict to the resolver rather than an upgrade.
  Nothing here was using an API the newer minors removed — the range was the
  whole problem.

## [0.7.0] — 2026-06-14

### Added (`/seo`)
- **`<SeoProvider>` + `defineSeo()`** — site-wide SEO defaults (siteUrl, siteName, titleTemplate, defaultTitle/Description/Image, locale, twitterSite). Per-page `<Seo>` inherits them, so most pages now pass nothing but a `title`.
- **Title templates** — a page `title` is folded into the provider's `titleTemplate` (`"%s | Fancy UI"`); `defaultTitle` is used verbatim when a page sets none.
- **Auto-canonical** — with a provider `siteUrl`, `<Seo>` derives the canonical from the current Inertia URL (query stripped, trailing slash dropped) and absolutises root-relative images. Pass `canonical`/`image` to override.
- **`howTo()` JSON-LD builder** — parity with `particle-academy/fancy-seo`.
- **`alternates` prop** — locale `<link rel="alternate" hreflang>` entries (incl. `x-default`).

Backwards-compatible: without a `<SeoProvider>`, `<Seo>` behaves exactly as before.

## [0.2.2] — 2026-05-29

### Fixed
- Widened the `@particle-academy/fancy-echarts` peer to `^3.0.0 || ^4.0.0` (was `^3.0.0`, which ERESOLVE-blocked the current echarts 4.x). `FancyAppRoot`'s `withECharts` loader only calls `registerAll()` / `registerBuiltinThemes()`, both unchanged in v4. (#2)
- Hardened the optional-peer lazy imports (`<FancyAppRoot withScreens>` and `<InertiaSchemaScreen>`): a bundler resolving an *absent* optional peer can return an export-less stub (`{ default: undefined }`) rather than rejecting, which slipped past the reject-only `.catch` and handed `React.lazy` `{ default: undefined }` (React #306). Both now guard the resolved export and degrade gracefully.

## [0.2.1] — 2026-05-28

### Fixed
- **Optional peers are optional again.** `<FancyAppRoot>` and `<InertiaSchemaScreen>` statically imported `@particle-academy/fancy-screens` and `@particle-academy/fancy-echarts` at module top level, so any bundler resolving `fancy-inertia` hard-failed (`"registerAll" is not exported by …`) when those optional peers weren't installed — even for consumers using only the base `<FancyAppRoot>` + `useFancyForm`. Both peers are now loaded lazily (`React.lazy` / dynamic `import()`) behind their `withScreens` / `withECharts` flags, so the base import graph references nothing but `react-fancy`. (#1)
- `withScreens` / `withECharts` now degrade gracefully with a console warning if the peer is absent, instead of failing.

This reverts the 0.2.0 "static providers" decision for the optional peers only. The `withScreens` / `withECharts` / `useFancyForm` / `registerFancyComponents` / `<InertiaSchemaScreen>` APIs are unchanged; the only observable difference is a one-tick async load of `<ScreenSystem>` on first mount when `withScreens` is on.

## [0.2.0] — 2026-05-26

### Changed (breaking)
- Follows `fancy-screens` 0.4 (Ports → Zustand). Removed `usePersistFancyState()` — use Zustand's `persist` middleware per store instead. See [docs/Migration.md](docs/Migration.md).
- `registerFancyComponents` now wires the registry into `fancy-screens`' schema engine under the hood (previously left to the consumer).
- Bundle slimmed ~24% (7.2 KB → 5.5 KB ESM).
- Peer bump: `@particle-academy/fancy-screens` ^0.4.0.

### Added
- Schema-driven hardening for `<InertiaSchemaScreen>` (the "agent emits a page" surface).

> Backfilled retroactively — 0.2.0 shipped while the Tynn MCP was disconnected, so it never got a changelog entry at release time.

## [0.1.2] — 2026-05-07

### Fixed
- Widened `@inertiajs/react` peer dependency to include `^3.0.0`. Apps on Inertia v3 were hitting a peer-dep mismatch despite the README claiming v1+ support.

## [0.1.1] — 2026-05-05

### Changed
- Switched publish workflow to OIDC Trusted Publisher (no `NODE_AUTH_TOKEN`).
  Bootstrap token used for the initial 0.1.0 publish has been revoked.
  Subsequent releases ship via GitHub Actions OIDC — zero token handling.

No code changes.

## [0.1.0] — 2026-05-04

Initial release.

### Added
- `<FancyAppRoot>` — composite app-shell provider (Toast.Provider + Screen.System + echarts module registration)
- `<FancyClientOnly>` — skip-SSR boundary for browser-only components
- `useFancyForm()` — Inertia useForm bridge with `field(name)` helper
- `usePersistFancyState()` — fancy-screens port store persistence across Inertia navigation
- `registerFancyComponents()` — pre-registered component whitelist for fancy-screens schema mode
- `<InertiaSchemaScreen>` — page-prop-driven schema rendering
- Documentation: README + docs/USAGE.md + docs/Recipes.md + docs/SSR.md

### Peer dependencies
- `react >= 18`, `react-dom >= 18`
- `@inertiajs/react >= 1` (required for Inertia-aware exports)
- `@particle-academy/react-fancy >= 3` (required)
- `@particle-academy/fancy-screens >= 0.2` (optional)
- `@particle-academy/fancy-echarts >= 3` (optional)
