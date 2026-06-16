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

/** Apply a `"%s | Brand"` template to a page title (no-op without `%s`). */
function applyTemplate(template: string | undefined, title: string): string {
  return template && template.includes("%s") ? template.replace("%s", title) : title;
}

/** Absolute root + path → clean canonical (strip query, drop trailing slash). */
function buildCanonical(siteUrl: string, url: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const path = (url.split(/[?#]/)[0] ?? "").replace(/\/+$/, "");
  return path === "" ? `${base}/` : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Make a root-relative image absolute against the configured site root. */
function absoluteImage(image: string | undefined, siteUrl: string | undefined): string | undefined {
  if (!image || /^https?:\/\//.test(image) || !siteUrl) return image;
  return `${siteUrl.replace(/\/+$/, "")}/${image.replace(/^\/+/, "")}`;
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
  if (isClientOnly && !hydrated) return null;

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
