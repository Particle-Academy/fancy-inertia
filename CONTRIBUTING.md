# Contributing to @particle-academy/fancy-inertia

Notes for anyone, human or agent, working ON this package's code. How to USE the
package is in [AGENTS.md](./AGENTS.md); what it is, is in [README.md](./README.md).
`CLAUDE.md` is a symlink to this file, so Claude Code reads these notes when it
works in this repo.

## Build and test

```bash
npm run build       # tsup: ESM + CJS + .d.ts into dist/
npm run dev         # tsup --watch
npm run lint        # tsc --noEmit && eslint .
npm test            # vitest run
```

- Tests live in `src/__tests__/` (`src/**/*.test.{ts,tsx}`, node environment by
  default; see `vitest.config.ts`).
- Each subpath (`./seo`, `./server`, `./pwa`, `./stack`, `./whats-new`) is its
  own entry in `package.json` `exports`; a new subpath needs an entry there and
  in `tsup.config.ts`.
- The optional peers (`fancy-screens`, `fancy-echarts`, `fancy-pwa`,
  `fancy-whats-new`) must stay optional: a consumer that has not installed one
  must still be able to import the root entry.

## Changelog

Update `CHANGELOG.md` (`## [Unreleased]`) in the same commit as the change.
