import { createServer as nodeCreateServer, Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * createFancyServer forwarded only `port`, and Inertia's SSR server then bound
 * every interface: 3.x defaults its host to "0.0.0.0", and 1.x / 2.x call
 * `listen(port)` with no host at all. So a Fancy app's SSR process, which renders
 * any page JSON it is sent, answered on the machine's public addresses too (kit
 * benchmark finding K15).
 *
 * The fakes below reproduce how each supported Inertia line calls listen(),
 * from their published dist/server.js. They bind real sockets, on port 0, and
 * the test reads the address the OS actually gave them.
 */

type Line = "1.x" | "2.1-2.3" | "3.x";

const state = vi.hoisted(() => ({
  line: "3.x" as Line,
  servers: [] as Server[],
  options: [] as unknown[],
}));

vi.mock("@inertiajs/react", () => ({ createInertiaApp: vi.fn() }));

vi.mock("@inertiajs/react/server", () => ({
  default: (_render: unknown, options: unknown) => {
    state.options.push(options);
    const server = nodeCreateServer((_req, res) => res.end());
    state.servers.push(server);
    if (state.line === "1.x") {
      // core 1.3.0 / 2.0.0: `let n = t || 13714; ... .listen(n, cb)`
      server.listen((options as number) || 13714, () => {});
    } else if (state.line === "2.1-2.3") {
      // core 2.3.0: takes an options object, reads port and cluster, ignores host.
      const port =
        typeof options === "number" ? options : ((options as { port?: number })?.port ?? 13714);
      server.listen(port, () => {});
    } else {
      // core 3.6.1: `const { port = 13714, host = "0.0.0.0" } = opts`
      const opts = typeof options === "number" ? { port: options } : (options as object);
      const { port = 13714, host = "0.0.0.0" } = (opts ?? {}) as { port?: number; host?: string };
      server.listen({ port, host }, () => {});
    }
  },
}));

import { createFancyServer } from "../server";

async function boundAddress(server: Server): Promise<string> {
  if (!server.listening) await new Promise((r) => server.once("listening", r));
  const address = server.address();
  return typeof address === "object" && address ? address.address : String(address);
}

afterEach(async () => {
  await Promise.all(
    state.servers.splice(0).map((s) => new Promise((r) => s.close(() => r(null)))),
  );
  state.options.length = 0;
});

const resolve = () => () => null;

describe("createFancyServer binds loopback unless told otherwise", () => {
  it.each(["1.x", "2.1-2.3", "3.x"] as Line[])(
    "on Inertia %s, the default is 127.0.0.1",
    async (line) => {
      state.line = line;
      createFancyServer({ resolve, port: 0 });

      expect(await boundAddress(state.servers[0])).toBe("127.0.0.1");
    },
  );

  it.each(["1.x", "2.1-2.3", "3.x"] as Line[])(
    "on Inertia %s, an explicit host is honoured",
    async (line) => {
      state.line = line;
      createFancyServer({ resolve, port: 0, host: "0.0.0.0" } as Parameters<
        typeof createFancyServer
      >[0]);

      expect(await boundAddress(state.servers[0])).toBe("0.0.0.0");
    },
  );

  it("hands the host to Inertia itself, so a host-aware Inertia sees it too", () => {
    state.line = "3.x";
    createFancyServer({ resolve, port: 0 });

    expect(state.options[0]).toMatchObject({ port: 0, host: "127.0.0.1" });
  });

  it("leaves every other server in the process alone", async () => {
    state.line = "2.1-2.3";
    createFancyServer({ resolve, port: 0 });
    await boundAddress(state.servers[0]);

    const other = nodeCreateServer();
    state.servers.push(other);
    other.listen(0);

    expect(await boundAddress(other)).not.toBe("127.0.0.1");
    expect(Object.prototype.hasOwnProperty.call(Server.prototype, "listen")).toBe(false);
  });
});
