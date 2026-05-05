import { z } from 'zod';

export const ContentSchema = z.object({
  project: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase, kebab-case'),
    name: z.string().min(1),
    statusBadge: z.enum(['alpha demo', 'draft spec v0.1', 'concept — no code yet']),
    primaryCta: z.object({
      label: z.string(),
      href: z.string().url().or(z.string().startsWith('/')),
    }),
  }),
  hero: z.object({
    headline: z.string().min(1).max(120),
    demoVideoUrl: z.string().url().optional(),
  }),
  problem: z.object({
    body: z.string().min(40),
  }),
  proposal: z.object({
    body: z.string().min(40),
  }),
  whyNow: z.object({
    body: z.string().min(40),
  }),
  cta: z.object({
    headline: z.string().min(1),
    secondary: z.object({
      label: z.literal('Get updates'),
      placeholder: z.string().default('your@email.com'),
    }),
  }),
  about: z.object({
    body: z.string().min(40),
    githubUrl: z.string().url(),
    contactUrl: z.string().url(),
  }),
  email: z.object({
    captureEndpoint: z.string().url(),
    projectId: z.string().min(1),
  }),
  footer: z.object({
    license: z.string(),
    rssUrl: z.string().url().optional(),
  }),
});

export type Content = z.infer<typeof ContentSchema>;
