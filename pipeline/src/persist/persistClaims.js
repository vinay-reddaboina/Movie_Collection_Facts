import { Film, Location, Collection, Source } from '../../../shared/index.js';

async function findOrCreateFilm(filmTitle) {
  let film = await Film.findOne({ title: filmTitle });
  if (!film) {
    // Minimal stub; real metadata (industry, releaseDate, etc.) gets
    // backfilled by hand during the manual verification pass (Phase 6).
    film = await Film.create({
      title: filmTitle,
      industry: 'Other',
      releaseDate: new Date(),
      status: 'released',
    });
  }
  return film;
}

async function findLocation(locationName) {
  if (!locationName) return null;
  return Location.findOne({ name: locationName });
}

/**
 * Writes one Source document per fetched page, then one Collection
 * document per validated claim found on that page. Claims are never
 * merged or overwritten — every claimant's number is its own row.
 */
export async function persistClaims({ sourceMeta, claims }) {
  const source = await Source.create({
    name: sourceMeta.name,
    type: sourceMeta.type,
    url: sourceMeta.url,
    claimant: sourceMeta.name,
    datePulled: sourceMeta.fetchedAt || new Date(),
  });

  const created = [];
  for (const claim of claims) {
    const film = await findOrCreateFilm(claim.filmTitle);
    const location = await findLocation(claim.locationName);

    const doc = await Collection.create({
      film: film._id,
      location: location?._id ?? null,
      date: new Date(claim.date),
      dayNumber: claim.dayNumber ?? undefined,
      metricType: claim.metricType,
      scope: claim.scope,
      amount: claim.amount,
      currency: claim.currency,
      isCumulative: claim.isCumulative,
      source: source._id,
      claimant: claim.claimant,
      notes: claim.notes ?? undefined,
    });
    created.push(doc);
  }

  return { source, collections: created };
}
