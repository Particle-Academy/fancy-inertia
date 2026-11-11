/**
 * The slice of `node:http` the SSR entry and its tests use. This package does
 * not depend on `@types/node` (it is a browser package with one server entry),
 * so the few members touched are declared here rather than adding one.
 */
declare module "node:http" {
  export interface IncomingMessage {
    url?: string;
  }
  export interface ServerResponse {
    end(): void;
  }
  export interface AddressInfo {
    address: string;
    family: string;
    port: number;
  }
  export class Server {
    listening: boolean;
    listen(...args: unknown[]): this;
    close(callback?: (err?: Error) => void): this;
    address(): AddressInfo | string | null;
    once(event: "listening", listener: (...args: unknown[]) => void): this;
  }
  export function createServer(
    listener?: (req: IncomingMessage, res: ServerResponse) => void,
  ): Server;
}
