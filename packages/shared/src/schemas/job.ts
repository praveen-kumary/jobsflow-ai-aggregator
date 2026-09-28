import { z } from "zod";

export const JobTypeEnum = z.enum(["fresher", "internship", "experienced"]);

export const JobExtractionSchema = z.object({
  is_duplicate: z.boolean(),
  duplicate_of_index: z.number().nullable().optional(),
  is_valid_job: z.boolean(),
  rejection_reason: z.string().nullable().optional(),
  company: z.string().default(""),
  role: z.string().default(""),
  batch_years: z.array(z.string()).default([]),
  degree: z.array(z.string()).default([]),
  city: z.array(z.string()).default([]),
  job_type: JobTypeEnum.default("fresher"),
  functional_area: z.string().nullable().optional(),
  experience_min: z.number().nullable().optional(),
  experience_max: z.number().nullable().optional(),
  salary_text: z.string().nullable().optional(),
  apply_url: z.string().default(""),
  deadline: z.string().nullable().optional(),
  description_clean: z.string().default(""),
  // Rich content fields for competitor-quality long-form pages
  eligibility_detailed: z.string().nullable().optional(),
  responsibilities_detailed: z.string().nullable().optional(),
  skills_tools: z.string().nullable().optional(),
  preparation_tips: z.string().nullable().optional(),
  important_points: z.string().nullable().optional(),
  about_company: z.string().nullable().optional(),
  career_growth: z.string().nullable().optional(),
});

export type JobExtractionResult = z.infer<typeof JobExtractionSchema>;

export const ScrapeConfigSchema = z.object({
  feedUrl: z.string().optional(),
  listingUrl: z.string().optional(),
  detailSelectors: z.object({
    title: z.string(),
    body: z.string(),
    applyLink: z.string(),
    categoryTags: z.string().optional(),
  }),
  rateLimitMs: z.number().default(2500),
});

export type ScrapeConfig = z.infer<typeof ScrapeConfigSchema>;

/**
 * Strips markdown code fences (```json ... ```) from LLM output string
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
