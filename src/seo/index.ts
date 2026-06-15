/**
 * @particle-academy/fancy-inertia/seo
 *
 * Per-page SEO for Inertia + Fancy apps: a terse `<Seo>` head helper and
 * dependency-free schema.org JSON-LD builders. Pairs with the server-rendered
 * baseline from the `particle-academy/fancy-seo` Laravel package.
 */
export { Seo } from "./Seo";
export type { SeoProps } from "./Seo";

export { defineSeo, SeoProvider, useSeoDefaults } from "./context";
export type { SeoDefaults } from "./context";

export {
  website,
  organization,
  softwareApplication,
  softwareSourceCode,
  article,
  breadcrumbList,
  faqPage,
  howTo,
  collectionPage,
  product,
} from "./json-ld";
export type { JsonLd } from "./json-ld";
