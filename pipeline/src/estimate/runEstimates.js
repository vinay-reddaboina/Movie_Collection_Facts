import { Location, Estimate, computeCeiling, rollupCeilings } from '../../../shared/index.js';

const DEFAULT_ASSUMPTIONS = {
  showsPerDay: 4,
  ticketPriceAvg: 200,
  occupancyAssumed: 0.65,
  currency: 'INR',
};

/**
 * Computes and persists the ceiling for one film/date across every theatre
 * that has capacity data on file, then rolls those leaf ceilings up through
 * city/state/country/worldwide and upserts an Estimate per level.
 *
 * Show-pattern assumptions (shows/day, avg price, occupancy) are uniform
 * across theatres for now — per-theatre overrides can replace
 * DEFAULT_ASSUMPTIONS once real show-time data is sourced.
 */
export async function runEstimatesForFilmDate({ filmId, date, scope = 'domestic', assumptions = {} }) {
  const { showsPerDay, ticketPriceAvg, occupancyAssumed, currency } = {
    ...DEFAULT_ASSUMPTIONS,
    ...assumptions,
  };

  const theatres = await Location.find({ type: 'theatre', totalSeats: { $gt: 0 } }).lean();
  if (theatres.length === 0) {
    return [];
  }

  const ancestorsOf = (theatre) =>
    theatre.ancestors.map((a) => ({ _id: String(a._id), name: a.name, type: a.type }));

  // Three parallel rollups over the same leaf set — ceiling amount, seat
  // count, and show count — so every ancestor estimate carries an honest
  // sum of the capacity that produced it, not just the dollar figure.
  const ceilingTotals = rollupCeilings(
    theatres.map((theatre) => ({
      locationId: String(theatre._id),
      ancestors: ancestorsOf(theatre),
      date,
      ceilingAmount: computeCeiling({
        seats: theatre.totalSeats,
        shows: showsPerDay,
        ticketPrice: ticketPriceAvg,
        occupancy: occupancyAssumed,
      }),
    }))
  );
  const seatTotals = rollupCeilings(
    theatres.map((theatre) => ({
      locationId: String(theatre._id),
      ancestors: ancestorsOf(theatre),
      date,
      ceilingAmount: theatre.totalSeats,
    }))
  );
  const showTotals = rollupCeilings(
    theatres.map((theatre) => ({
      locationId: String(theatre._id),
      ancestors: ancestorsOf(theatre),
      date,
      ceilingAmount: showsPerDay,
    }))
  );

  const seatsByLocation = new Map(seatTotals.map((t) => [t.locationId, t.ceilingAmount]));
  const showsByLocation = new Map(showTotals.map((t) => [t.locationId, t.ceilingAmount]));

  const estimates = [];
  for (const total of ceilingTotals) {
    const estimate = await Estimate.findOneAndUpdate(
      { film: filmId, location: total.locationId, date: total.date },
      {
        film: filmId,
        location: total.locationId,
        date: total.date,
        scope,
        method: {
          seatsCounted: seatsByLocation.get(total.locationId),
          showsCounted: showsByLocation.get(total.locationId),
          ticketPriceAvg,
          occupancyAssumed,
        },
        ceilingAmount: total.ceilingAmount,
        currency,
        computedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    estimates.push(estimate);
  }

  return estimates;
}
