import { createContext, useContext, type ReactNode } from "react";

/**
 * Site-wide SEO defaults. Set them once near the app root with `<SeoProvider>`
 * so every per-page `<Seo>` stays terse — it inherits the brand, title template,
 * locale, default card image, and (crucially) the `siteUrl` that powers
 * auto-canonical + absolute OG image URLs.
 */
export interface SeoDefaults {
  /**
   * Absolute site root, e.g. `"https://ui.particle.academy"`. When set, `<Seo>`
   * auto-derives the canonical from the current Inertia URL and absolutises
   * root-relative images. Match your `fancy-seo` `url` so client + server agree.
   */
  siteUrl?: string;
  /** `og:site_name` and the brand woven into `titleTemplate`. */
  siteName?: string;
  /**
   * Title pattern with a `%s` placeholder, e.g. `"%s | Fancy UI"`. Applied to a
   * page's `title`. The `defaultTitle` is used verbatim (never templated).
   */
  titleTemplate?: string;
  /** Untemplated `<title>` used when a page sets none (e.g. the home page). */
  defaultTitle?: string;
  /** Fallback meta description when a page sets none. */
  defaultDescription?: string;
  /** Fallback social-card image (absolute, or root-relative to `siteUrl`). */
  defaultImage?: string;
  /** `og:locale`, e.g. `"en_US"`. */
  locale?: string;
  /** Twitter `@handle` for `twitter:site`. */
  twitterSite?: string;
}

const SeoContext = createContext<SeoDefaults>({});

/**
 * Identity helper for authoring + typing the site defaults — mirrors the
 * `defineFancySeo` ergonomics. Pass the result to `<SeoProvider value={…}>`.
 */
export function defineSeo(defaults: SeoDefaults): SeoDefaults {
  return defaults;
}

/** Provide site-wide SEO defaults to every `<Seo>` below it. */
export function SeoProvider({ value, children }: { value: SeoDefaults; children: ReactNode }) {
  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

/** Read the nearest `<SeoProvider>` defaults (empty object when none). */
export function useSeoDefaults(): SeoDefaults {
  return useContext(SeoContext);
}
