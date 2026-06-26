import { callLLM, extractJSON } from '../llm/client.js';
import { validateClaims } from './schema.js';

const SYSTEM_PROMPT = `You extract box-office collection claims from messy trade/news text about Indian films.
Return ONLY a JSON array, no prose. Each element must have exactly these fields:
filmTitle (string), claimant (string, who is making the claim - the outlet or production house),
metricType (one of: gross, net, share, footfalls, occupancy),
scope (one of: domestic, overseas, worldwide),
amount (number, in the currency's smallest stated unit as written, e.g. plain rupees not lakhs/crores),
currency (ISO-like code, e.g. INR, USD),
date (ISO date string, the date the figure is reported for),
dayNumber (integer day-of-release the figure covers, or null if cumulative/unclear),
isCumulative (boolean - true if this is a running total, false if a single day's figure),
locationName (string or null - a specific theatre/city/state/country if mentioned, else null for an unscoped headline figure),
notes (string or null - anything ambiguous about the figure worth flagging).
If the text contains no collection figures, return an empty array []. Never invent a figure not present in the text.`;

export async function extractClaimsFromText(rawText, { sourceName } = {}) {
  if (!rawText || !rawText.trim()) {
    return { valid: [], errors: [] };
  }

  const prompt = `Source: ${sourceName || 'unknown'}\n\nText:\n${rawText.slice(0, 12000)}`;
  const response = await callLLM({ system: SYSTEM_PROMPT, prompt, maxTokens: 4000 });
  const rawClaims = extractJSON(response);

  if (!Array.isArray(rawClaims)) {
    throw new Error('LLM extraction did not return a JSON array');
  }

  return validateClaims(rawClaims);
}
