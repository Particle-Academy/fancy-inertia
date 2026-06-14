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
}));

import { Seo } from "../seo/Seo";
import { softwareSourceCode } from "../seo/json-ld";

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
});
