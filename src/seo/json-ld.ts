/**
 * Tiny, dependency-free schema.org JSON-LD builders. Each returns a plain
 * object you can hand to `<Seo jsonLd={…}>` (or render yourself). Hand-typed —
 * no `schema-dts` runtime — so the package stays zero-third-party-dep.
 */

const CONTEXT = "https://schema.org" as const;

export type JsonLd = Record<string, unknown> & { "@context": string; "@type": string };

/** `WebSite` — the site itself, optionally with a SearchAction. */
export function website(input: {
  name: string;
  url: string;
  description?: string;
  /** A URL template like `https://x.com/search?q={search_term_string}`. */
  searchUrlTemplate?: string;
}): JsonLd {
  const node: JsonLd = {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
  if (input.description) node.description = input.description;
  if (input.searchUrlTemplate) {
    node.potentialAction = {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: input.searchUrlTemplate },
      "query-input": "required name=search_term_string",
    };
  }
  return node;
}

/** `Organization` — the publisher/brand. */
export function organization(input: {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}): JsonLd {
  const node: JsonLd = { "@context": CONTEXT, "@type": "Organization", name: input.name, url: input.url };
  if (input.logo) node.logo = input.logo;
  if (input.sameAs?.length) node.sameAs = input.sameAs;
  return node;
}

/** `SoftwareApplication` — an app/tool, e.g. the kit or a package. */
export function softwareApplication(input: {
  name: string;
  url: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  softwareVersion?: string;
  /** Set both for a price offer; `"0"` for free. */
  price?: string;
  priceCurrency?: string;
}): JsonLd {
  const node: JsonLd = { "@context": CONTEXT, "@type": "SoftwareApplication", name: input.name, url: input.url };
  if (input.description) node.description = input.description;
  if (input.applicationCategory) node.applicationCategory = input.applicationCategory;
  if (input.operatingSystem) node.operatingSystem = input.operatingSystem;
  if (input.softwareVersion) node.softwareVersion = input.softwareVersion;
  if (input.price != null) {
    node.offers = { "@type": "Offer", price: input.price, priceCurrency: input.priceCurrency ?? "USD" };
  }
  return node;
}

/** `SoftwareSourceCode` — a package/component's source (repo + language). */
export function softwareSourceCode(input: {
  name: string;
  url: string;
  codeRepository: string;
  programmingLanguage?: string;
  description?: string;
  license?: string;
}): JsonLd {
  const node: JsonLd = {
    "@context": CONTEXT,
    "@type": "SoftwareSourceCode",
    name: input.name,
    url: input.url,
    codeRepository: input.codeRepository,
  };
  if (input.programmingLanguage) node.programmingLanguage = input.programmingLanguage;
  if (input.description) node.description = input.description;
  if (input.license) node.license = input.license;
  return node;
}

/** `Article` / blog post / doc page. */
export function article(input: {
  headline: string;
  url: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): JsonLd {
  const node: JsonLd = { "@context": CONTEXT, "@type": "Article", headline: input.headline, url: input.url };
  if (input.description) node.description = input.description;
  if (input.image) node.image = input.image;
  if (input.datePublished) node.datePublished = input.datePublished;
  if (input.dateModified) node.dateModified = input.dateModified;
  if (input.authorName) node.author = { "@type": "Person", name: input.authorName };
  return node;
}

/** `BreadcrumbList` — ordered trail; positions are derived from order. */
export function breadcrumbList(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** `FAQPage` — question/answer pairs. */
export function faqPage(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** `CollectionPage` — an index/listing page. */
export function collectionPage(input: { name: string; url: string; description?: string }): JsonLd {
  const node: JsonLd = { "@context": CONTEXT, "@type": "CollectionPage", name: input.name, url: input.url };
  if (input.description) node.description = input.description;
  return node;
}

/** `Product` — a sellable item with an optional offer. */
export function product(input: {
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  price?: string;
  priceCurrency?: string;
  url?: string;
}): JsonLd {
  const node: JsonLd = { "@context": CONTEXT, "@type": "Product", name: input.name };
  if (input.description) node.description = input.description;
  if (input.image) node.image = input.image;
  if (input.brand) node.brand = { "@type": "Brand", name: input.brand };
  if (input.price != null) {
    node.offers = {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.priceCurrency ?? "USD",
      ...(input.url ? { url: input.url } : {}),
    };
  }
  return node;
}
