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

// Checked against real Day 1 claims for 10 real Tollywood films (see
// shared/seedReal.js): produced a spread across all four bands rather than
// clustering everything into one, so the defaults are kept as-is.
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
