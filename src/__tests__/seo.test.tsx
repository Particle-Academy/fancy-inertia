import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

// Inertia's <Head> only renders into the real head manager inside a running
// Inertia app; for a unit test we mock it to a passthrough that emits the
// title + children inline so we can assert the produced tags.
vi.mock("@inertiajs/react", () => ({
  Head: ({ title, children }: { title?: string; children?: ReactNode }) => (
    <>
      {title ? <title>{title}</title> : null}
      {children}
    </>
  ),
  usePage: () => ({ url: "/packages/react-fancy?ref=nav" }),
}));

import { Seo } from "../seo/Seo";
import { SeoProvider } from "../seo/context";
import { softwareSourceCode, howTo } from "../seo/json-ld";

function render(node: ReactNode): string {
  return renderToStaticMarkup(<>{node}</>);
}

describe("<Seo>", () => {
  it("emits title, description, canonical, og/twitter, and indexable robots", () => {
    const html = render(
      <Seo
        title="react-fancy — Fancy UI"
        description="Tailwind v4 React primitives"
        canonical="https://ui.particle.academy/packages/react-fancy"
        image="https://ui.particle.academy/og/react-fancy.png"
        siteName="Fancy UI"
      />,
    );
    expect(html).toContain("<title>react-fancy — Fancy UI</title>");
    expect(html).toContain('name="description" content="Tailwind v4 React primitives"');
    expect(html).toContain('rel="canonical" href="https://ui.particle.academy/packages/react-fancy"');
    expect(html).toContain('property="og:title" content="react-fancy — Fancy UI"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="robots" content="index, follow, max-image-preview:large"');
  });

  it("noindex flips the robots directive", () => {
    const html = render(<Seo title="Admin" noindex />);
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain("index, follow");
  });

  it("renders JSON-LD nodes as ld+json scripts with escaped <", () => {
    const html = render(
      <Seo
        title="P"
        jsonLd={softwareSourceCode({
          name: "p",
          url: "u",
          codeRepository: "r",
          description: "<b>x</b>",
        })}
      />,
    );
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"SoftwareSourceCode"');
    // raw "<" must be escaped so a stray </script> can't break out
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("\\u003c");
  });

  it("joins keyword arrays", () => {
    const html = render(<Seo keywords={["react", "tailwind"]} />);
    expect(html).toContain('name="keywords" content="react, tailwind"');
  });

  it("emits hreflang alternates", () => {
    const html = render(
      <Seo
        title="P"
        alternates={[
          { hreflang: "en", href: "https://x.test/en" },
          { hreflang: "x-default", href: "https://x.test/" },
        ]}
      />,
    );
    // renderToStaticMarkup keeps the camelCase prop name; the real DOM lowercases
    // it to `hreflang`. Match case-insensitively so the test holds either way.
    expect(html).toMatch(/rel="alternate" hreflang="en" href="https:\/\/x.test\/en"/i);
    expect(html).toMatch(/rel="alternate" hreflang="x-default" href="https:\/\/x.test\/"/i);
  });
});

describe("<Seo> with <SeoProvider> defaults", () => {
  function renderWithDefaults(node: ReactNode, value: Parameters<typeof SeoProvider>[0]["value"]): string {
    return renderToStaticMarkup(<SeoProvider value={value}>{node}</SeoProvider>);
  }

  it("applies the title template to a page title", () => {
    const html = renderWithDefaults(<Seo title="Fancy Diff" />, {
      titleTemplate: "%s | Fancy UI",
      defaultTitle: "Fancy UI",
    });
    expect(html).toContain("<title>Fancy Diff | Fancy UI</title>");
    expect(html).toContain('property="og:title" content="Fancy Diff | Fancy UI"');
  });

  it("uses the untemplated defaultTitle when a page sets none", () => {
    const html = renderWithDefaults(<Seo />, {
      titleTemplate: "%s | Fancy UI",
      defaultTitle: "Fancy UI for React, Inertia, and Laravel",
    });
    expect(html).toContain("<title>Fancy UI for React, Inertia, and Laravel</title>");
  });

  it("auto-derives a clean canonical from siteUrl + the current URL", () => {
    const html = renderWithDefaults(<Seo title="P" />, { siteUrl: "https://ui.particle.academy" });
    // query stripped; absolute; no trailing slash
    expect(html).toContain(
      'rel="canonical" href="https://ui.particle.academy/packages/react-fancy"',
    );
  });

  it("absolutises a root-relative default image against siteUrl", () => {
    const html = renderWithDefaults(<Seo title="P" />, {
      siteUrl: "https://ui.particle.academy",
      defaultImage: "/og/home.png",
    });
    expect(html).toContain('property="og:image" content="https://ui.particle.academy/og/home.png"');
  });

  it("lets per-page props override defaults", () => {
    const html = renderWithDefaults(<Seo title="X" canonical="https://override.test/x" />, {
      siteUrl: "https://ui.particle.academy",
      siteName: "Fancy UI",
    });
    expect(html).toContain('rel="canonical" href="https://override.test/x"');
    expect(html).toContain('property="og:site_name" content="Fancy UI"');
  });
});

describe("howTo()", () => {
  it("builds positioned HowToSteps", () => {
    const node = howTo({
      name: "Install Fancy CLI",
      steps: [
        { name: "Init", text: "npx fancy-ui init" },
        { name: "Add", text: "npx fancy-ui add card", url: "https://x.test/add" },
      ],
    });
    expect(node["@type"]).toBe("HowTo");
    const steps = node.step as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(2);
    expect(steps[0]?.position).toBe(1);
    expect(steps[1]?.url).toBe("https://x.test/add");
  });
});
