import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState, type ReactNode } from "react";
import { useSeoDefaults } from "./context";

export interface SeoProps {
  /** `<title>`. Also used for `og:title` / `twitter:title`. */
  title?: string;
  /** Meta description; also `og:description` / `twitter:description`. */
  description?: string;
  /** Absolute canonical URL; also `og:url`. */
  canonical?: string;
  /** Absolute social-card image URL; `og:image` / `twitter:image`. */
  image?: string;
  /** Open Graph type. Default `"website"`. */
  type?: "website" | "article" | "profile" | "book" | (string & {});
  /** `og:site_name`. */
  siteName?: string;
  /** `og:locale`, e.g. `"en_US"`. */
  locale?: string;
  /** Emit `robots: noindex, nofollow` instead of the indexable default. */
  noindex?: boolean;
  /** `meta keywords` (joined when an array). */
  keywords?: string | string[];
  /** Twitter card type. Default `"summary_large_image"`. */
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  /** Twitter `@handle` for `twitter:site`. */
  twitterSite?: string;
  /** schema.org JSON-LD node(s) — emitted as `<script type="application/ld+json">`. */
  jsonLd?: object | object[];
  /** Locale-alternate `<link rel="alternate" hreflang>` entries (incl. `x-default`). */
  alternates?: Array<{ hreflang: string; href: string }>;
  /**
   * Render client-only (emit nothing during SSR; take over after hydration).
   * Overrides the provider's `clientOnly` default. Use when a server baseline
   * (e.g. fancy-seo's Blade `<x-fancy-seo::head>`) already renders the head, so
   * `<Seo>` doesn't duplicate it under SSR. See `SeoDefaults.clientOnly`.
   */
  clientOnly?: boolean;
  /** Extra raw head children (escape hatch). */
  children?: ReactNode;
}

const INDEXABLE = "index, follow, max-image-preview:large";
const NOINDEX = "noindex, nofollow";

/**
 * Remove the server baseline's copies of the tags this `<Seo>` now owns.
 *
 * ## Why this is needed at all
 *
 * `head-key` is Inertia's convention *inside* `<Head>` — Inertia's own head
 * manager rewrites it to `data-inertia` and dedupes on that. A `head-key` in a
 * **Blade** template (`<x-fancy-seo::head>`) is never rewritten by anything, so
 * the manager cannot see it: `isInertiaManagedElement` tests for `data-inertia`
 * and nothing else. The baseline is therefore invisible to dedup, and every tag
 * `<Seo>` emits is **appended beside** the server's copy rather than replacing
 * it.
 *
 * That is live and load-bearing: pages served two `<meta name="description">`
 * with different text, plus duplicated `og:*` and `twitter:*`. Both packages
 * documented a dedup that never happened.
 *
 * ## Why not just put `data-inertia` on the Blade tags
 *
 * Because Inertia *deletes* what it manages. Its update pass removes every
 * `data-inertia` element that the current page does not re-emit
 * (`index === -1 → remove()`). A baseline tagged that way survives only on pages
 * that render a matching `<Seo>` — on any page that renders some other `<Head>`
 * and no `<Seo>`, the whole server-rendered head is silently deleted after
 * hydration. On the showcase that is 109 of 305 pages. Trading duplicated tags
 * for *missing* tags is not a fix.
 *
 * So the layer that adds the duplicate is the layer that removes it, and it
 * removes **only the keys it actually emits** — a baseline key `<Seo>` does not
 * provide (a route-specific `keywords`, say) is left alone, because the server
 * knows things the client defaults do not.
 */
function useRetireServerBaseline(emittedKeys: string[], active: boolean): void {
  // Sorted + joined so the effect re-runs when the SET changes, not when the
  // array identity does — this list is rebuilt on every render.
  const keyList = [...emittedKeys].sort().join("|");

  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    for (const key of keyList ? keyList.split("|") : []) {
      // `CSS.escape` is absent in some SSR/jsdom shims; attribute-scan instead
      // of building a selector so a key containing quotes or colons is safe.
      const stale = Array.from(document.head.querySelectorAll("[head-key]")).filter(
        (el) =>
          el.getAttribute("head-key") === key &&
          // Never touch Inertia's own elements — only the un-managed baseline.
          !el.hasAttribute("data-inertia") &&
          !el.hasAttribute("inertia"),
      );
      for (const el of stale) el.remove();
    }
  }, [keyList, active]);
}

/** Apply a `"%s | Brand"` template to a page title (no-op without `%s`). */
function applyTemplate(template: string | undefined, title: string): string {
  return template && template.includes("%s") ? template.replace("%s", title) : title;
}

const SLASH = 47; // "/"

/**
 * Trim slashes from one end, without a regex.
 *
 * `/\/+$/` and `/^\/+/` are polynomial-ReDoS shapes — CodeQL
 * `js/polynomial-redos`, reported twice here at high severity. A quantifier
 * anchored at one end is retried from every start position, so a string of many
 * slashes costs time quadratic in its length.
 *
 * A URL is not usually attacker-controlled, but "not usually" is the whole
 * problem: these run on **every page render of every consuming app**, and
 * `siteUrl` and `url` arrive from host config and the current route — neither of
 * which this component gets to vouch for. A character scan is linear, cannot
 * backtrack at all, and is simpler than reasoning about whether some route could
 * ever carry a few thousand slashes.
 */
function trimSlashes(value: string, from: "start" | "end"): string {
  if (from === "end") {
    let end = value.length;
    while (end > 0 && value.charCodeAt(end - 1) === SLASH) end--;

    return value.slice(0, end);
  }

  let start = 0;
  while (start < value.length && value.charCodeAt(start) === SLASH) start++;

  return value.slice(start);
}

/** Absolute root + path → clean canonical (strip query, drop trailing slash). */
function buildCanonical(siteUrl: string, url: string): string {
  const base = trimSlashes(siteUrl, "end");
  const path = trimSlashes(url.split(/[?#]/)[0] ?? "", "end");

  return path === "" ? `${base}/` : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Make a root-relative image absolute against the configured site root. */
function absoluteImage(image: string | undefined, siteUrl: string | undefined): string | undefined {
  // `/^https?:\/\//` is anchored with no quantifier over a repeatable class, so
  // it has no backtracking to exploit and stays a regex.
  if (!image || /^https?:\/\//.test(image) || !siteUrl) return image;

  return `${trimSlashes(siteUrl, "end")}/${trimSlashes(image, "start")}`;
}

/**
 * One terse, JSON-friendly head helper for per-page SEO. Renders into Inertia's
 * `<Head>` with `head-key` dedupe, so it cleanly overrides server-rendered
 * defaults (e.g. a `fancy-seo` `<x-fancy-seo::head>` baseline) on SPA
 * navigation:
 *
 * ```tsx
 * import { Seo } from "@particle-academy/fancy-inertia/seo";
 * import { softwareSourceCode, breadcrumbList } from "@particle-academy/fancy-inertia/seo";
 *
 * <Seo
 *   title={`${pkg.name} — Fancy UI`}
 *   description={pkg.tagline}
 *   canonical={pkg.url}
 *   image={pkg.ogImage}
 *   jsonLd={[
 *     softwareSourceCode({ name: pkg.name, url: pkg.url, codeRepository: pkg.repo, programmingLanguage: "TypeScript" }),
 *     breadcrumbList([{ name: "Packages", url: "/packages" }, { name: pkg.name, url: pkg.url }]),
 *   ]}
 * />
 * ```
 */
export function Seo({
  title,
  description,
  canonical,
  image,
  type = "website",
  siteName,
  locale,
  noindex,
  keywords,
  twitterCard = "summary_large_image",
  twitterSite,
  jsonLd,
  alternates,
  clientOnly,
  children,
}: SeoProps) {
  const defaults = useSeoDefaults();
  const pageUrl = (usePage() as { url?: string }).url ?? "";

  // Client-only mode: emit nothing on the server / first client render, then
  // take over the head after hydration (head-key override) + on SPA nav. Lets a
  // server-rendered baseline (fancy-seo's Blade head) own the SSR head without
  // <Seo> duplicating every tag. Server and first client render BOTH return null,
  // so there's no hydration mismatch.
  const isClientOnly = clientOnly ?? defaults.clientOnly ?? false;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // NOTE: the client-only bail-out lives just above the `return` at the bottom,
  // NOT here. Every hook in this component has to run on every render — an early
  // return above `useRetireServerBaseline` would make it conditional, and a
  // hook count that changes between renders desyncs React and throws from inside
  // it. `hydrated` flipping false -> true is exactly such a transition.

  // Fold per-page props over site defaults. A page passing nothing still gets a
  // complete, correct head from the provider.
  const resolvedTitle = title
    ? applyTemplate(defaults.titleTemplate, title)
    : defaults.defaultTitle;
  const resolvedDescription = description ?? defaults.defaultDescription;
  const resolvedSiteName = siteName ?? defaults.siteName;
  const resolvedLocale = locale ?? defaults.locale;
  const resolvedTwitterSite = twitterSite ?? defaults.twitterSite;
  const resolvedImage = absoluteImage(image ?? defaults.defaultImage, defaults.siteUrl);
  const resolvedCanonical =
    canonical ?? (defaults.siteUrl ? buildCanonical(defaults.siteUrl, pageUrl) : undefined);

  const kw = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  const nodes = jsonLd == null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  // Exactly the `head-key`s emitted below, under the same conditions. Used to
  // retire the server baseline's copies — see `useRetireServerBaseline`.
  const emittedKeys: string[] = [
    ...(resolvedDescription ? ["description", "og:description", "twitter:description"] : []),
    ...(kw ? ["keywords"] : []),
    ...(resolvedCanonical ? ["canonical", "og:url"] : []),
    "robots",
    "og:type",
    ...(resolvedSiteName ? ["og:site_name"] : []),
    ...(resolvedTitle ? ["og:title", "twitter:title"] : []),
    ...(resolvedImage ? ["og:image", "twitter:image"] : []),
    ...(resolvedLocale ? ["og:locale"] : []),
    "twitter:card",
    ...(resolvedTwitterSite ? ["twitter:site"] : []),
    ...(alternates ?? []).map((alt) => `alternate:${alt.hreflang}`),
    ...nodes.map((_, i) => `ld-${i}`),
  ];

  useRetireServerBaseline(emittedKeys, !isClientOnly || hydrated);

  // Every hook above this line. Client-only mode emits nothing on the server or
  // the first client render, so markup matches and hydration cannot mismatch.
  if (isClientOnly && !hydrated) return null;

  return (
    <Head title={resolvedTitle}>
      {resolvedDescription ? (
        <meta head-key="description" name="description" content={resolvedDescription} />
      ) : null}
      {kw ? <meta head-key="keywords" name="keywords" content={kw} /> : null}
      {resolvedCanonical ? (
        <link head-key="canonical" rel="canonical" href={resolvedCanonical} />
      ) : null}
      <meta head-key="robots" name="robots" content={noindex ? NOINDEX : INDEXABLE} />

      {/* Open Graph */}
      <meta head-key="og:type" property="og:type" content={type} />
      {resolvedSiteName ? (
        <meta head-key="og:site_name" property="og:site_name" content={resolvedSiteName} />
      ) : null}
      {resolvedTitle ? <meta head-key="og:title" property="og:title" content={resolvedTitle} /> : null}
      {resolvedDescription ? (
        <meta head-key="og:description" property="og:description" content={resolvedDescription} />
      ) : null}
      {resolvedCanonical ? (
        <meta head-key="og:url" property="og:url" content={resolvedCanonical} />
      ) : null}
      {resolvedImage ? <meta head-key="og:image" property="og:image" content={resolvedImage} /> : null}
      {resolvedLocale ? (
        <meta head-key="og:locale" property="og:locale" content={resolvedLocale} />
      ) : null}

      {/* Twitter */}
      <meta head-key="twitter:card" name="twitter:card" content={twitterCard} />
      {resolvedTwitterSite ? (
        <meta head-key="twitter:site" name="twitter:site" content={resolvedTwitterSite} />
      ) : null}
      {resolvedTitle ? (
        <meta head-key="twitter:title" name="twitter:title" content={resolvedTitle} />
      ) : null}
      {resolvedDescription ? (
        <meta head-key="twitter:description" name="twitter:description" content={resolvedDescription} />
      ) : null}
      {resolvedImage ? (
        <meta head-key="twitter:image" name="twitter:image" content={resolvedImage} />
      ) : null}

      {/* Locale alternates (hreflang) */}
      {alternates?.map((alt) => (
        <link
          key={alt.hreflang}
          head-key={`alternate:${alt.hreflang}`}
          rel="alternate"
          hrefLang={alt.hreflang}
          href={alt.href}
        />
      ))}

      {/* Structured data — escape `<` so a stray `</script>` in data can't break out. */}
      {nodes.map((node, i) => (
        <script
          key={i}
          head-key={`ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      {children}
    </Head>
  );
}

Seo.displayName = "Seo";
