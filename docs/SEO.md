# SEO

`@particle-academy/fancy-inertia/seo` gives you per-page SEO as a one-liner:
a terse `<Seo>` head helper and dependency-free schema.org JSON-LD builders. It
pairs with the **server-rendered baseline** from the `particle-academy/fancy-seo`
Laravel package — the package renders the default head (so crawlers/social/LLM
bots see real meta on the first byte), and `<Seo>` overrides it per page on SPA
navigation via Inertia's `head-key` dedupe.

## `<Seo>`

```tsx
import { Seo, softwareSourceCode, breadcrumbList } from "@particle-academy/fancy-inertia/seo";

export default function PackagePage({ pkg }) {
  return (
    <>
      <Seo
        title={`${pkg.name} — Fancy UI`}
        description={pkg.tagline}
        canonical={pkg.url}
        image={pkg.ogImage}
        siteName="Fancy UI"
        jsonLd={[
          softwareSourceCode({
            name: pkg.name,
            url: pkg.url,
            codeRepository: pkg.repo,
            programmingLanguage: "TypeScript",
          }),
          breadcrumbList([
            { name: "Packages", url: "/packages" },
            { name: pkg.name, url: pkg.url },
          ]),
        ]}
      />
      {/* page… */}
    </>
  );
}
```

It emits `<title>`, `meta description`, `link canonical`, `meta robots`, the full
Open Graph + Twitter card set, and one `<script type="application/ld+json">` per
JSON-LD node. Each tag carries a stable `head-key` so it cleanly overrides the
server-rendered default rather than duplicating it.

## Site defaults — `<SeoProvider>` + `defineSeo`

Set the brand, title template, default image, locale, and site root **once** near
the app root so every `<Seo>` stays terse and inherits them. With a `siteUrl` set,
`<Seo>` also **auto-derives the canonical** from the current Inertia URL (query
stripped, trailing slash dropped) and **absolutises root-relative images** — so
most pages pass nothing but a `title`.

```tsx
import { SeoProvider, defineSeo } from "@particle-academy/fancy-inertia/seo";

const seo = defineSeo({
  siteUrl: "https://ui.particle.academy",   // enables auto-canonical + absolute OG image
  siteName: "Fancy UI",
  titleTemplate: "%s | Fancy UI",            // applied to a page's title
  defaultTitle: "Fancy UI for React, Inertia, and Laravel",  // used verbatim when a page sets none
  defaultDescription: "React, Inertia, and Laravel UI components for Human+ UX.",
  defaultImage: "/og/home.png",
  locale: "en_US",
  twitterSite: "@particleacademy",
});

// near the root (inside FancyAppRoot is fine):
<SeoProvider value={seo}>{children}</SeoProvider>
```

```tsx
// A package page now needs almost nothing — title is templated, canonical +
// og:image + site_name + locale all come from the provider:
<Seo title={pkg.name} description={pkg.tagline} jsonLd={[/* … */]} />
// → <title>react-fancy | Fancy UI</title>, canonical https://ui.particle.academy/packages/react-fancy, …
```

Match `siteUrl` to your `fancy-seo` `url` config so the client canonical agrees
with the server baseline. Per-page props always win over provider defaults.

### Props

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | `<title>` + `og:title` + `twitter:title` |
| `description` | `string` | `description` + `og:description` + `twitter:description` |
| `canonical` | `string` | absolute canonical URL + `og:url` |
| `image` | `string` | absolute `og:image` + `twitter:image` |
| `type` | `"website" \| "article" \| …` | `og:type` (default `"website"`) |
| `siteName` / `locale` | `string` | `og:site_name` / `og:locale` |
| `noindex` | `boolean` | emit `robots: noindex, nofollow` (admin/auth/staging pages) |
| `keywords` | `string \| string[]` | `meta keywords` (joined when an array) |
| `twitterCard` | `"summary" \| "summary_large_image" \| …` | default `summary_large_image` |
| `twitterSite` | `string` | `twitter:site` handle |
| `jsonLd` | `object \| object[]` | schema.org node(s) — use the builders below |
| `alternates` | `Array<{ hreflang, href }>` | locale `<link rel="alternate" hreflang>` (incl. `x-default`) |
| `children` | `ReactNode` | escape hatch — extra raw `<head>` tags |

`noindex` is the one to remember: tag admin/auth/checkout pages with `<Seo noindex />`
so they're excluded even though they may be reachable.

## JSON-LD builders

Pure functions returning plain schema.org objects (hand-typed, zero runtime deps):

```tsx
import {
  website, organization, softwareApplication, softwareSourceCode,
  article, breadcrumbList, faqPage, howTo, collectionPage, product,
} from "@particle-academy/fancy-inertia/seo";

website({ name: "Fancy UI", url: "https://ui.particle.academy/", searchUrlTemplate: "https://ui.particle.academy/search?q={search_term_string}" });
softwareApplication({ name: "Fancy UI", url: "…", applicationCategory: "DeveloperApplication", operatingSystem: "Web", price: "0" });
softwareSourceCode({ name: "react-fancy", url: "…", codeRepository: "https://github.com/Particle-Academy/react-fancy", programmingLanguage: "TypeScript" });
breadcrumbList([{ name: "Packages", url: "/packages" }, { name: "react-fancy", url: "/packages/react-fancy" }]);
article({ headline: "…", url: "…", datePublished: "2026-01-01", authorName: "…" });
faqPage([{ question: "…?", answer: "…" }]);
howTo({ name: "Install Fancy CLI", steps: [{ name: "Init", text: "npx fancy-cli init" }, { name: "Add", text: "npx fancy-cli add card" }] });
collectionPage({ name: "Packages", url: "/packages" });
product({ name: "Pro", price: "29", priceCurrency: "USD", url: "/pricing" });
```

`faqPage` / `howTo` no longer render as Google rich results — emit them only on
pages whose **visible** content genuinely is a Q&A / ordered how-to (the markup
still aids machine understanding + AI answers).

Each adds `"@context": "https://schema.org"` and only includes the fields you pass.
Pass the result(s) to `<Seo jsonLd={…}>` — or render them yourself.

## Where the server baseline comes from

The first-byte head (the default title/description/canonical/OG/JSON-LD a crawler
sees before any JS runs) is rendered by the **`particle-academy/fancy-seo`** Laravel
package via `<x-fancy-seo::head>` in your root Blade template. `<Seo>` is the
client/per-page layer on top. Use both: server baseline for crawlers, `<Seo>` for
page-specific overrides + structured data.

## Why not just Inertia `<Head>`?

`<Seo>` *is* Inertia `<Head>` underneath — it just saves you hand-writing ~14
`<meta>`/`<link>` tags (with the right `head-key`s) and the JSON-LD `<script>`
boilerplate on every page, and keeps the OG/Twitter pairs in sync with `title`/
`description`/`image` automatically.
