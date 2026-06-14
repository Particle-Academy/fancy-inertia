import { Head } from "@inertiajs/react";
import type { ReactNode } from "react";

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
  /** Extra raw head children (escape hatch). */
  children?: ReactNode;
}

const INDEXABLE = "index, follow, max-image-preview:large";
const NOINDEX = "noindex, nofollow";

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
  children,
}: SeoProps) {
  const kw = Array.isArray(keywords) ? keywords.join(", ") : keywords;
  const nodes = jsonLd == null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <Head title={title}>
      {description ? (
        <meta head-key="description" name="description" content={description} />
      ) : null}
      {kw ? <meta head-key="keywords" name="keywords" content={kw} /> : null}
      {canonical ? <link head-key="canonical" rel="canonical" href={canonical} /> : null}
      <meta head-key="robots" name="robots" content={noindex ? NOINDEX : INDEXABLE} />

      {/* Open Graph */}
      <meta head-key="og:type" property="og:type" content={type} />
      {siteName ? <meta head-key="og:site_name" property="og:site_name" content={siteName} /> : null}
      {title ? <meta head-key="og:title" property="og:title" content={title} /> : null}
      {description ? (
        <meta head-key="og:description" property="og:description" content={description} />
      ) : null}
      {canonical ? <meta head-key="og:url" property="og:url" content={canonical} /> : null}
      {image ? <meta head-key="og:image" property="og:image" content={image} /> : null}
      {locale ? <meta head-key="og:locale" property="og:locale" content={locale} /> : null}

      {/* Twitter */}
      <meta head-key="twitter:card" name="twitter:card" content={twitterCard} />
      {twitterSite ? <meta head-key="twitter:site" name="twitter:site" content={twitterSite} /> : null}
      {title ? <meta head-key="twitter:title" name="twitter:title" content={title} /> : null}
      {description ? (
        <meta head-key="twitter:description" name="twitter:description" content={description} />
      ) : null}
      {image ? <meta head-key="twitter:image" name="twitter:image" content={image} /> : null}

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
