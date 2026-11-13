import { execFileSync } from "node:child_process";
import { createServer, request } from "node:http";

const PROXY_PORT = 3002;
const REQUEST_TIMEOUT_MS = 30_000;

const apiEndpoint = execFileSync(
  "terraform",
  ["-chdir=infra/environments/floci-local", "output", "-raw", "api_endpoint"],
  { encoding: "utf8", cwd: new URL("../..", import.meta.url) },
).trim();
const apiHost = new URL(apiEndpoint).hostname;

const server = createServer((incoming, outgoing) => {
  const upstream = request(
    {
      hostname: "127.0.0.1",
      port: 4566,
      path: incoming.url,
      method: incoming.method,
      headers: {
        ...incoming.headers,
        host: apiHost,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.on("error", () => outgoing.destroy());
      response.pipe(outgoing);
    },
  );

  upstream.on("error", () => {
    if (outgoing.headersSent) {
      outgoing.destroy();
      return;
    }

    outgoing.writeHead(502, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ message: "Floci API is unavailable." }));
  });

  incoming.on("aborted", () => upstream.destroy());
  incoming.on("error", () => upstream.destroy());
  outgoing.on("close", () => upstream.destroy());
  incoming.pipe(upstream);
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  process.stdout.write(`Local API proxy: http://localhost:${PROXY_PORT} -> Floci (${apiHost})\n`);
});
