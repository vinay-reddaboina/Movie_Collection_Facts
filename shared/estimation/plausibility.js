/**
 * Ratio of a claimed figure to the computed physical ceiling for the same
 * film/location/date. >1 means the claim exceeds what the venue capacity
 * could have produced.
 */
export function plausibilityScore(claimedAmount, ceilingAmount) {
  if (ceilingAmount <= 0) {
    throw new Error('ceilingAmount must be positive');
  }
  return claimedAmount / ceilingAmount;
}

// Default bands; tunable once real claims are compared against real ceilings (Phase 7).
export const PLAUSIBILITY_BANDS = {
  impossible: 1,
  aggressive: 0.85,
  plausible: 0.4,
};

export function classifyPlausibility(score) {
  if (score > PLAUSIBILITY_BANDS.impossible) return 'impossible';
  if (score > PLAUSIBILITY_BANDS.aggressive) return 'aggressive';
  if (score > PLAUSIBILITY_BANDS.plausible) return 'plausible';
  return 'conservative';
}
