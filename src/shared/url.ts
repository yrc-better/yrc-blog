const BASE = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

function trimSlashes(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, "");
}

export function route(...segments: string[]): string {
  const path = segments.map(trimSlashes).filter(Boolean).join("/");
  return path === "" ? BASE : `${BASE}${path}/`;
}

export function asset(path: string): string {
  return `${BASE}${trimSlashes(path)}`;
}

export function resolveHref(href: string): string {
  return /^https?:\/\//.test(href) ? href : route(href);
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href) || href.startsWith("mailto:");
}
