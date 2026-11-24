import { createServer, type Server } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

export type StaticSite = { origin: string; url: (sitePath: string) => string; close: () => Promise<void> };

function resolveFile(root: string, relative: string): string | undefined {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root)) return undefined;
  if (existsSync(target) && statSync(target).isFile()) return target;
  const index = path.join(target, "index.html");
  if (existsSync(index)) return index;
  return undefined;
}

export async function serveDist(distDir: string, basePath: string, port = 0): Promise<StaticSite> {
  const root = path.resolve(distDir);
  if (!existsSync(path.join(root, "index.html"))) {
    throw new Error(`No build found in ${root}. Run \`npm run build\` first.`);
  }
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const notFound = path.join(root, "404.html");

  const server: Server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
    if (!pathname.startsWith(base)) {
      response.writeHead(pathname === "/" ? 302 : 404, pathname === "/" ? { location: base } : {});
      response.end();
      return;
    }
    const relative = pathname.slice(base.length);
    const file = resolveFile(root, relative);
    if (file && !pathname.endsWith("/") && file.endsWith("index.html") && !relative.endsWith("index.html")) {
      response.writeHead(301, { location: `${pathname}/` });
      response.end();
      return;
    }
    const served = file ?? notFound;
    response.writeHead(file ? 200 : 404, { "content-type": TYPES[path.extname(served)] ?? "application/octet-stream" });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(served).pipe(response);
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const origin = `http://127.0.0.1:${actualPort}`;
  return {
    origin,
    url: (sitePath: string) => `${origin}${base}${encodeURI(sitePath.replace(/^\/+/, ""))}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
