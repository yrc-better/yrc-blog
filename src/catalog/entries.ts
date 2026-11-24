import { getCollection, render, type CollectionEntry } from "astro:content";
import { newestFirst } from "../shared/dates.ts";
import { resolveHref, route } from "../shared/url.ts";

export type Paper = CollectionEntry<"papers">;
export type Post = CollectionEntry<"posts">;
export type Project = CollectionEntry<"projects">;
export type Article = Paper | Post;

export async function renderEntry(entry: Article | Project): ReturnType<typeof render> {
  return render(entry);
}

export type EntryKind = "paper" | "post" | "project";

export type FeedItem = {
  kind: EntryKind;
  id: string;
  title: string;
  description: string;
  date: Date;
  href: string;
};

export const POST_CATEGORIES = {
  life: { label: "Life", zh: "生活" },
  notes: { label: "Notes", zh: "笔记" },
} as const satisfies Record<Post["data"]["category"], { label: string; zh: string }>;

export async function listPapers(): Promise<Paper[]> {
  return (await getCollection("papers")).sort(newestFirst);
}

export async function listPosts(): Promise<Post[]> {
  return (await getCollection("posts")).sort(newestFirst);
}

export async function listProjects(): Promise<Project[]> {
  return (await getCollection("projects")).sort(newestFirst);
}

export function paperHref(paper: Paper): string {
  return route("papers", paper.id);
}

export function postHref(post: Post): string {
  return route("posts", post.id);
}

export function projectHref(project: Project): string {
  return resolveHref(project.data.href);
}

export async function listFeed(): Promise<FeedItem[]> {
  const [papers, posts, projects] = await Promise.all([listPapers(), listPosts(), listProjects()]);
  const items: FeedItem[] = [
    ...papers.map((p) => toFeedItem("paper", p, paperHref(p))),
    ...posts.map((p) => toFeedItem("post", p, postHref(p))),
    ...projects.map((p) => toFeedItem("project", p, projectHref(p))),
  ];
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function toFeedItem(kind: EntryKind, entry: Article | Project, href: string): FeedItem {
  return {
    kind,
    id: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    href,
  };
}

export async function countEntries(): Promise<Record<EntryKind, number>> {
  const [papers, posts, projects] = await Promise.all([listPapers(), listPosts(), listProjects()]);
  return { paper: papers.length, post: posts.length, project: projects.length };
}

export function neighbours<T extends Article>(list: T[], current: T): { newer?: T; older?: T } {
  const index = list.findIndex((entry) => entry.id === current.id);
  const newer = index > 0 ? list[index - 1] : undefined;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  return { ...(newer ? { newer } : {}), ...(older ? { older } : {}) };
}
