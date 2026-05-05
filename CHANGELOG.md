# Changelog

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
