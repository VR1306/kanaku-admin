import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1d4ed8');

export const ctaSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, 'Button label is required').max(24, 'Label max 24 characters'),
  href: z
    .string()
    .trim()
    .min(1, 'Link is required')
    .regex(/^(\/|#|https:\/\/)/, 'Use /path, #anchor or https:// link'),
  style: z.enum(['primary', 'secondary']),
});

const linkHref = z
  .string()
  .trim()
  .min(1, 'Link is required')
  .regex(/^(\/|#|https:\/\/|\{userApp\})/, 'Use /path, #anchor, https://… or {userApp}/signup');

/** The "overview card" next to the headline: figures, bars and the floating budget chip. */
export const heroVisualSchema = z.object({
  label: z.string().trim().max(40),
  value: z.string().trim().min(1, 'Card value is required').max(20),
  caption: z.string().trim().max(60),
  bars: z
    .array(z.object({ value: z.number().positive().max(1000), highlight: z.boolean().optional() }))
    .min(2, 'At least 2 bars')
    .max(8, 'At most 8 bars'),
  floating: z
    .object({
      label: z.string().trim().max(30),
      value: z.string().trim().max(30),
      progress: z.number().min(0).max(100),
    })
    .nullable(),
});

export const navbarSchema = z.object({
  links: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().trim().min(1, 'Menu label is required').max(24),
        href: linkHref,
      }),
    )
    .min(1, 'Keep at least one menu link')
    .max(6, 'At most 6 menu links'),
  loginLabel: z.string().trim().min(1).max(24),
  loginHref: linkHref,
  signupLabel: z.string().trim().min(1).max(24),
  signupHref: linkHref,
});

export const heroSchema = z
  .object({
    /** Small line under the buttons, e.g. "Free to start · No card required". */
    note: z.string().max(120).optional(),
    visual: heroVisualSchema.nullable().optional(),
    eyebrow: z.string().max(60),
    headline: z
      .string()
      .trim()
      .min(1, 'Headline is required')
      .max(60, 'Headline max 60 characters'),
    subheading: z.string().max(200, 'Sub-heading max 200 characters'),
    image: z
      .object({
        src: z
          .string()
          .max(3_200_000)
          .regex(
            /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/,
            'Use an https:// URL or an uploaded PNG/JPG/WebP',
          ),
        alt: z.string().trim().min(1, 'Alt text is required for the hero image').max(140),
      })
      .nullable(),
    ctaLimit: z.union([z.literal(2), z.literal(3)]),
    ctas: z.array(ctaSchema).min(1, 'At least 1 button').max(3),
  })
  .refine((h) => h.ctas.length <= h.ctaLimit, {
    message: 'Too many buttons for the configured limit',
    path: ['ctas'],
  })
  .refine((h) => h.ctas.filter((c) => c.style === 'primary').length <= 1, {
    message: 'Only one button can be primary',
    path: ['ctas'],
  });

export const featureSchema = z.object({
  id: z.string(),
  icon: z.enum(['plus', 'wallet', 'chart', 'repeat', 'receipt', 'bell', 'shield']),
  title: z.string().trim().min(1).max(40, 'Title max 40 characters'),
  description: z.string().trim().min(1).max(140, 'Description max 140 characters'),
  visible: z.boolean(),
});

export const FAQ_CATEGORIES = [
  'General',
  'Billing',
  'Security',
  'Data & privacy',
  'Account',
] as const;
export const faqSchema = z.object({
  id: z.string(),
  question: z.string().trim().min(1).max(120, 'Question max 120 characters'),
  answer: z.string().trim().min(1).max(800, 'Answer max 800 characters'),
  category: z.enum(FAQ_CATEGORIES),
  visible: z.boolean(),
});

export const pricingPlanSchema = z.object({
  planId: z.string(),
  visible: z.boolean(),
  badge: z.string().max(24),
  ctaLabel: z.string().max(24),
  ctaHref: z.string(),
  bullets: z.array(z.string().max(80)).max(8, 'Up to 8 bullets'),
});

export const themeSchema = z.object({
  primary: hex,
  secondary: hex,
  accent: hex,
  background: hex,
  surface: hex,
  text: hex,
  radius: z.enum(['sm', 'md', 'lg']),
  buttonStyle: z.enum(['solid', 'outline']),
});

export const siteConfigSchema = z
  .object({
    hero: heroSchema,
    navbar: navbarSchema.optional(),
    features: z.array(featureSchema),
    pricing: z.object({
      plans: z.array(pricingPlanSchema),
      defaultView: z.enum(['monthly', 'yearly']),
    }),
    faq: z.array(faqSchema),
    footer: z.object({
      tagline: z.string().max(80),
      supportEmail: z.email(),
      copyright: z.string().max(80),
    }),
    theme: themeSchema,
  })
  .refine((c) => c.features.filter((f) => f.visible).length >= 3, {
    message: 'At least 3 features must stay visible',
    path: ['features'],
  });

export type SiteConfig = z.infer<typeof siteConfigSchema>;
