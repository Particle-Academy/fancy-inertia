# Changelog

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
