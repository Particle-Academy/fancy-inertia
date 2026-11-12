import { Head } from "@inertiajs/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * createFancyServer took no `title` option, so the server rendered every page
 * with Inertia's default title callback, the identity. Two consequences, both
 * found by the lab's kit benchmark (K21):
 *
 * - The first byte's <title> said "Log in" where the client, whose
 *   createInertiaApp formats it, says "Log in - Fancy". A reader without
 *   JavaScript saw a different title from everyone else.
 * - A page that sets no title had NO title in the server-rendered head, because
 *   Inertia only emits a default title when the callback returns one for "".
 *   A root template that falls back to the app name only when SSR does not
 *   answer then produces a document with no title at all.
 *
 * The real createInertiaApp renders here; only Inertia's HTTP server is
 * replaced, to capture the render function createFancyServer hands it.
 */

type Rendered = { head: string[]; body: string };
type RenderPage = (page: Record<string, unknown>) => Promise<Rendered>;

const captured = vi.hoisted(() => ({ render: null as null | ((page: unknown) => unknown) }));

vi.mock("@inertiajs/react/server", () => ({
  default: (render: (page: unknown) => unknown) => {
    captured.render = render;
  },
}));

import { createFancyServer } from "../server";

afterEach(() => {
  captured.render = null;
});

const pages = {
  Titled: () => createElement(Head, { title: "Log in" }),
  Untitled: () => createElement("main", null, "no title here"),
};

function serve(options: Partial<Parameters<typeof createFancyServer>[0]> = {}): RenderPage {
  createFancyServer({
    resolve: (name) => pages[name as keyof typeof pages],
    appRoot: false,
    port: 0,
    ...options,
  });
  if (!captured.render) throw new Error("createFancyServer did not start a server");
  return captured.render as RenderPage;
}

const page = (component: string) => ({
  component,
  props: { errors: {} },
  url: "/",
  version: null,
});

function titles(rendered: Rendered): string[] {
  return rendered.head.filter((element) => element.startsWith("<title"));
}

describe("createFancyServer formats the server-rendered title", () => {
  const title = (value: string) => (value ? `${value} - Fancy` : "Fancy");

  it("passes the page title through the same callback the client uses", async () => {
    const rendered = await serve({ title })(page("Titled"));

    expect(titles(rendered)).toHaveLength(1);
    expect(titles(rendered)[0]).toContain(">Log in - Fancy</title>");
  });

  it("emits the callback's fallback title when the page sets none", async () => {
    const rendered = await serve({ title })(page("Untitled"));

    expect(titles(rendered)).toHaveLength(1);
    expect(titles(rendered)[0]).toContain(">Fancy</title>");
  });

  it("leaves the title as the page set it when no callback is given", async () => {
    const rendered = await serve()(page("Titled"));

    expect(titles(rendered)).toHaveLength(1);
    expect(titles(rendered)[0]).toContain(">Log in</title>");
  });
});
