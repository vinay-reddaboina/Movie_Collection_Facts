function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * Picks the estimate to compare a claim against: an exact location match
 * for the same date if one exists, otherwise the broadest (highest
 * ceiling) rollup available for that date - so an unscoped "worldwide"
 * claim still gets compared against something.
 */
export function matchEstimateForCollection(collection, estimates) {
  const sameDate = estimates.filter((e) => sameDay(e.date, collection.date));
  if (sameDate.length === 0) return null;

  if (collection.location) {
    const exact = sameDate.find((e) => e.location && String(e.location._id || e.location) === String(collection.location._id || collection.location));
    if (exact) return exact;
  }

  return sameDate.reduce((best, e) => (e.ceilingAmount > (best?.ceilingAmount ?? -Infinity) ? e : best), null);
}
