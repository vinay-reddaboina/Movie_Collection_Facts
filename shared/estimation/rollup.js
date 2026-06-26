function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Bottom-up rollup of leaf (theatre-level) ceilings into every ancestor
 * node — city, state, country, worldwide — per date. Relies on each leaf
 * carrying its location's denormalized `ancestors` array (see the Location
 * model's ancestors-array tree pattern), so no recursive tree walk is
 * needed: a leaf's ceiling is just added once per ancestor it has.
 *
 * @param {Array<{locationId: string, ancestors: Array<{_id: string}>, date: Date, ceilingAmount: number}>} leafRecords
 * @returns {Array<{locationId: string, date: Date, ceilingAmount: number, leafCount: number}>}
 */
export function rollupCeilings(leafRecords) {
  const totals = new Map();

  for (const leaf of leafRecords) {
    const dKey = dateKey(leaf.date);
    const nodes = [{ _id: leaf.locationId }, ...(leaf.ancestors || [])];

    for (const node of nodes) {
      const key = `${node._id}|${dKey}`;
      if (!totals.has(key)) {
        totals.set(key, {
          locationId: node._id,
          date: leaf.date,
          ceilingAmount: 0,
          leafCount: 0,
        });
      }
      const entry = totals.get(key);
      entry.ceilingAmount += leaf.ceilingAmount;
      entry.leafCount += 1;
    }
  }

  return Array.from(totals.values());
}
