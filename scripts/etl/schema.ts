import { z } from 'zod';

// Output schema (strict)
export const PlanV2 = z.object({
  id: z.string(), // stable unique id
  provider: z.string().trim(),
  name: z.string().trim(),
  name_en: z.string().trim(),
  category: z.enum([
    'salud',
    'vida',
    'hogar',
    'auto',
    'viaje',
    'soat',
    'dental',
    'educativa',
    'mascotas',
    'otros',
  ]),
  country: z.enum(['CO', 'MX']),

  // pricing (monthly)
  // Allow 0 for quote-only flows; search API filters out base_price = 0
  base_price: z.number().nonnegative(),
  currency: z.enum(['COP', 'MXN', 'USD', 'EUR']),

  // links
  external_link: z.string().url(), // required
  brochure_link: z.string().url().optional(), // optional

  // presentation
  benefits: z.array(z.string()).min(3).max(12),
  benefits_en: z.array(z.string()).min(3).max(12),

  // optional metadata (pass-through if present)
  min_age: z.number().nonnegative().optional(),
  max_age: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
});

export type PlanV2Type = z.infer<typeof PlanV2>;
export type PlanCategory = z.infer<typeof PlanV2.shape.category>;
export type Country = z.infer<typeof PlanV2.shape.country>;
export type Currency = z.infer<typeof PlanV2.shape.currency>;

// Input schema (loose)
export const WebHoundRowLoose = z
  .object({
    provider_name: z.string().optional(),
    provider: z.string().optional(),
    company: z.string().optional(),

    title: z.string().optional(),
    name: z.string().optional(),
    plan_name: z.string().optional(),
    title_en: z.string().optional(),
    english_name: z.string().optional(),

    category: z.string().optional(),
    category_raw: z.string().optional(),
    product_type: z.string().optional(),
    type: z.string().optional(),

    country: z.string().optional(),
    country_code: z.string().optional(),

    currency: z.string().optional(),
    base_price: z.union([z.number(), z.string()]).optional(),
    monthly_price: z.union([z.number(), z.string()]).optional(),
    price: z
      .object({
        amount: z.union([z.number(), z.string()]).optional(),
        period: z.string().optional(), // 'day' | 'month' | 'year' | unknown
        currency: z.string().optional(),
      })
      .partial()
      .optional(),

    links: z
      .object({
        product: z.string().url().optional(),
        brochure: z.string().url().optional(),
        url: z.string().url().optional(),
        website: z.string().url().optional(),
        quote: z.string().url().optional(),
        pdf: z.string().url().optional(),
      })
      .partial()
      .optional(),
    product_url: z.string().url().optional(),
    brochure_url: z.string().url().optional(),
    url: z.string().url().optional(),
    website: z.string().url().optional(),
    quote_url: z.string().url().optional(),
    pdf_url: z.string().url().optional(),

    benefits: z.array(z.string()).optional(),
    benefits_en: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    bulletPoints: z.array(z.string()).optional(),

    notes: z.string().optional(),
    description: z.string().optional(),

    tags: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),

    min_age: z.union([z.number(), z.string()]).optional(),
    max_age: z.union([z.number(), z.string()]).optional(),
  })
  .partial()
  .catchall(z.any());

export type WebHoundRowLooseType = z.infer<typeof WebHoundRowLoose>;


