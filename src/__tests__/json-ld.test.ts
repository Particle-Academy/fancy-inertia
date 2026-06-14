import { describe, expect, it } from "vitest";
import {
  website,
  organization,
  softwareApplication,
  softwareSourceCode,
  article,
  breadcrumbList,
  faqPage,
  collectionPage,
  product,
} from "../seo/json-ld";

describe("json-ld builders", () => {
  it("website includes context/type + optional SearchAction", () => {
    const bare = website({ name: "Fancy UI", url: "https://x/" });
    expect(bare["@context"]).toBe("https://schema.org");
    expect(bare["@type"]).toBe("WebSite");
    expect(bare).not.toHaveProperty("potentialAction");

    const withSearch = website({
      name: "Fancy UI",
      url: "https://x/",
      searchUrlTemplate: "https://x/s?q={search_term_string}",
    });
    expect((withSearch.potentialAction as Record<string, unknown>)["@type"]).toBe("SearchAction");
  });

  it("softwareApplication only emits an offer when price is set", () => {
    expect(softwareApplication({ name: "A", url: "u" })).not.toHaveProperty("offers");
    const paid = softwareApplication({ name: "A", url: "u", price: "0" });
    expect((paid.offers as Record<string, unknown>).priceCurrency).toBe("USD");
  });

  it("softwareSourceCode carries the repo + language", () => {
    const node = softwareSourceCode({
      name: "fancy-term-host",
      url: "https://x/p",
      codeRepository: "https://github.com/Particle-Academy/fancy-term-host",
      programmingLanguage: "TypeScript",
    });
    expect(node["@type"]).toBe("SoftwareSourceCode");
    expect(node.codeRepository).toContain("fancy-term-host");
    expect(node.programmingLanguage).toBe("TypeScript");
  });

  it("breadcrumbList numbers positions from 1 in order", () => {
    const node = breadcrumbList([
      { name: "Packages", url: "/packages" },
      { name: "react-fancy", url: "/packages/react-fancy" },
    ]);
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toBe("/packages/react-fancy");
  });

  it("faqPage maps Q/A pairs", () => {
    const node = faqPage([{ question: "Q?", answer: "A." }]);
    const main = node.mainEntity as Array<Record<string, unknown>>;
    expect(main[0]["@type"]).toBe("Question");
    expect((main[0].acceptedAnswer as Record<string, unknown>).text).toBe("A.");
  });

  it("organization / collectionPage / article / product shape sanity", () => {
    expect(organization({ name: "PA", url: "u", sameAs: ["x"] }).sameAs).toEqual(["x"]);
    expect(collectionPage({ name: "Packages", url: "u" })["@type"]).toBe("CollectionPage");
    expect(article({ headline: "H", url: "u", authorName: "Me" }).author).toEqual({
      "@type": "Person",
      name: "Me",
    });
    expect((product({ name: "P", price: "9", url: "u" }).offers as Record<string, unknown>).url).toBe("u");
  });
});
