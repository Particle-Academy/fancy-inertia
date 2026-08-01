import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

// A pathological path: many slashes and no trailing one, which is the shape
// that makes an end-anchored quantifier retry from every start position.
const MANY = "/".repeat(50_000) + "x";

vi.mock("@inertiajs/react", () => ({
  Head: ({ title, children }: { title?: string; children?: ReactNode }) => (
    <>
      {title ? <title>{title}</title> : null}
      {children}
    </>
  ),
  usePage: () => ({ url: MANY }),
}));

import { Seo } from "../seo/Seo";
import { SeoProvider } from "../seo/context";

function renderWith(node: ReactNode, defaults: Record<string, unknown>): string {
  return renderToStaticMarkup(<SeoProvider value={defaults as never}>{node}</SeoProvider>);
}

/**
 * The canonical and image helpers used to trim slashes with `/\/+$/` and
 * `/^\/+/` — polynomial-ReDoS shapes, reported twice by CodeQL at high
 * severity (`js/polynomial-redos`).
 *
 * These run on EVERY page render of every consuming app, over a `siteUrl` from
 * host config and a `url` from the current route. Neither is something this
 * component gets to vouch for, so "a URL is not usually attacker-controlled" is
 * not a guarantee it can rely on.
 *
 * The timing bound is the honest test: correctness alone would pass against the
 * regex too. It is set generously — the quadratic version takes seconds on this
 * input, the linear one is sub-millisecond — so it fails on a regression
 * without being flaky on a slow machine.
 */
describe("slash trimming is linear, not quadratic", () => {
  it("renders a canonical from a 50k-slash path without stalling", () => {
    const started = performance.now();
    const html = renderWith(<Seo title="P" />, { siteUrl: "https://ui.particle.academy" });
    const elapsed = performance.now() - started;

    expect(html).toContain('rel="canonical"');
    expect(elapsed).toBeLessThan(1_000);
  });

  it("absolutises an image whose path is nothing but slashes, without stalling", () => {
    const started = performance.now();
    const html = renderWith(<Seo title="P" />, {
      siteUrl: "https://ui.particle.academy" + "/".repeat(50_000),
      defaultImage: "/".repeat(50_000) + "og.png",
    });
    const elapsed = performance.now() - started;

    // Both ends trimmed: the site root loses its trailing run, the image its
    // leading one, and exactly one slash joins them.
    expect(html).toContain('content="https://ui.particle.academy/og.png"');
    expect(elapsed).toBeLessThan(1_000);
  });
});

describe("trimming still behaves", () => {
  // The rewrite has to be behaviour-preserving; a fast wrong answer is worse
  // than a slow right one.
  it("drops a trailing slash run from siteUrl and keeps a single separator", () => {
    const html = renderWith(<Seo title="P" />, {
      siteUrl: "https://ui.particle.academy///",
      defaultImage: "///og/home.png",
    });

    expect(html).toContain('content="https://ui.particle.academy/og/home.png"');
  });

  it("leaves an already-absolute image alone", () => {
    const html = renderWith(<Seo title="P" />, {
      siteUrl: "https://ui.particle.academy",
      defaultImage: "https://cdn.example.test/og.png",
    });

    expect(html).toContain('content="https://cdn.example.test/og.png"');
  });
});
