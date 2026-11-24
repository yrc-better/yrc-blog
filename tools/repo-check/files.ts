import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

export function git(...args: string[]): string[] {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function trackedFiles(): string[] {
  return git("-c", "core.quotepath=off", "ls-files", "--cached");
}

export function workingFiles(): string[] {
  return git("-c", "core.quotepath=off", "ls-files", "--cached", "--others", "--exclude-standard").filter((file) =>
    existsSync(path.join(REPO_ROOT, file)),
  );
}

export function read(file: string): string {
  return readFileSync(path.join(REPO_ROOT, file), "utf8");
}

export type Block = { attrs: string; body: string; line: number };

export function blocks(source: string, tag: "style" | "script"): Block[] {
  const pattern = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  return Array.from(source.matchAll(pattern), (match) => ({
    attrs: (match[1] ?? "").trim(),
    body: match[2] ?? "",
    line: lineAt(source, match.index),
  }));
}

export function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}
