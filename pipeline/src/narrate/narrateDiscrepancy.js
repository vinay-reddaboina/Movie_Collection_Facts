import { callLLM } from '../llm/client.js';
import { plausibilityScore, classifyPlausibility } from '../../../shared/index.js';

const SYSTEM_PROMPT = `You write a short, neutral note explaining a box-office figure discrepancy.
You are given only computed numbers - no outside knowledge, no speculation about motives.
State the gap factually (e.g. "Claim X is N% above the computed ceiling for this date/location").
Do not accuse anyone of lying. Do not invent context not present in the numbers. Two sentences max.`;

/**
 * Produces a one-paragraph explanation of why claims disagree with each
 * other and with the computed ceiling - built strictly from the numbers
 * already on screen, never from the original scraped text.
 */
export async function narrateDiscrepancy({ filmTitle, date, claims, ceilingAmount, currency }) {
  const scored = claims.map((claim) => ({
    claimant: claim.claimant,
    amount: claim.amount,
    score: plausibilityScore(claim.amount, ceilingAmount),
  }));

  const summary = scored
    .map((c) => `${c.claimant}: ${c.amount} ${currency} (${classifyPlausibility(c.score)}, ${(c.score * 100).toFixed(0)}% of ceiling)`)
    .join('; ');

  const prompt = `Film: ${filmTitle}\nDate: ${date}\nComputed ceiling: ${ceilingAmount} ${currency}\nClaims: ${summary}`;

  const narration = await callLLM({ system: SYSTEM_PROMPT, prompt, maxTokens: 300 });
  return { narration: narration.trim(), scored };
}
