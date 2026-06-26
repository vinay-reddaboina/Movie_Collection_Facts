import { z } from 'zod';

// Shape the LLM must return for each collection claim it finds in raw text.
// Mirrors the Collection model fields the pipeline will persist.
export const claimSchema = z.object({
  filmTitle: z.string().min(1),
  claimant: z.string().min(1),
  metricType: z.enum(['gross', 'net', 'share', 'footfalls', 'occupancy']),
  scope: z.enum(['domestic', 'overseas', 'worldwide']),
  amount: z.number().positive(),
  currency: z.string().min(1),
  date: z.string(), // ISO date string; parsed to Date at persist time
  dayNumber: z.number().int().positive().nullable().optional(),
  isCumulative: z.boolean().default(false),
  locationName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Validated per-claim (not as one array.parse) so a single malformed claim
// doesn't discard every other valid claim the LLM extracted from the same page.
export function validateClaims(rawClaims) {
  const valid = [];
  const errors = [];
  for (const [index, raw] of rawClaims.entries()) {
    const result = claimSchema.safeParse(raw);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({ index, raw, issues: result.error.issues });
    }
  }
  return { valid, errors };
}
