import { z } from 'zod';

// Body shape for both self-report routes. Neither route is trusted as the
// "real" number - it just becomes one more Collection row tagged to its
// own Source, sitting next to every other claim for the same film/date.
export const claimInputSchema = z.object({
  claimant: z.string().min(1),
  metricType: z.enum(['gross', 'net', 'share', 'footfalls', 'occupancy']),
  scope: z.enum(['domestic', 'overseas', 'worldwide']),
  amount: z.number().positive(),
  currency: z.string().min(1).default('INR'),
  date: z.string(),
  dayNumber: z.number().int().positive().optional(),
  isCumulative: z.boolean().default(false),
  locationId: z.string().nullable().optional(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
});
