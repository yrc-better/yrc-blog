import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const ENTRY_PATTERN = "*/index.md";

const tags = z.array(z.string().min(1)).max(8).default([]);

const papers = defineCollection({
  loader: glob({ pattern: ENTRY_PATTERN, base: "./src/content/papers" }),
  schema: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(20),
    date: z.coerce.date(),
    tags,
    affiliations: z.string().optional(),
    code: z.url().optional(),
    paper: z.url().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: ENTRY_PATTERN, base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(10),
    date: z.coerce.date(),
    category: z.enum(["life", "notes"]),
    tags,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: ENTRY_PATTERN, base: "./src/content/projects" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(10),
    date: z.coerce.date(),
    kind: z.string().min(1),
    status: z.enum(["live", "building", "archived"]),
    href: z.string().regex(/^(https:\/\/\S+|[a-z0-9-]+(\/[a-z0-9-]+)*\/)$/, {
      message: "href must be https://… or a site-relative path like 'projects/band-simulator/'",
    }),
    cta: z.string().min(1),
    stack: z.array(z.string()).default([]),
  }),
});

export const collections = { papers, posts, projects };
