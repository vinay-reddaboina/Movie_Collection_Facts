import 'dotenv/config';
import { connectDB, disconnectDB } from './db.js';
import Film from './models/Film.js';
import Location from './models/Location.js';
import Source from './models/Source.js';
import Collection from './models/Collection.js';
import Estimate from './models/Estimate.js';

// Real Day 1 India box-office claims for 10 Telugu (Tollywood) wide releases,
// each traced to the real trade-analyst article it was reported on. Net and
// gross are kept as separate claims, never merged or averaged, the same way
// the rest of the app treats conflicting figures.
//
// `dayShows` is the real, reported Day 1 show count where a trade source
// actually published one. Three films below have no verified show count
// (Sacnilk's page only surfaced occupancy %, not the raw count) and
// deliberately get no Estimate at all rather than a guessed one — an
// invented showsCounted would be exactly the kind of unsupported figure
// this project refuses to produce.
//
// Where a show count IS real, the ceiling still leans on two unavoidable
// approximations because no public per-film dataset of seats-per-show or
// per-show ticket price exists:
//   - seatsCounted: 360, a blended midpoint between reported multiplex
//     screen capacity (~150-380 seats) and single-screen capacity
//     (~450-1100 seats) for a pan-India wide release.
//   - ticketPriceAvg: 180 (INR), a midpoint within the Telangana/Andhra
//     Pradesh government-mandated ticket price bands (Telangana multiplex
//     INR 100-250; AP multiplex INR 75-250; single-screen AC up to INR 150).
//   - occupancyAssumed: 1.0 — full house, every show. Not a realistic
//     expectation, but the actual physical ceiling: the most a claim could
//     be true at without occupancy itself being impossible.
// These are industry-average approximations, not per-theatre verified data,
// and are visible in full on every Estimate via `method` so anyone can
// disagree with the assumption without disagreeing with the math.
const SEAT_ASSUMPTION = 360;
const TICKET_PRICE_ASSUMPTION = 180;
const OCCUPANCY_ASSUMPTION = 1.0;

const FILMS = [
  {
    title: 'Pushpa 2: The Rule',
    releaseDate: '2024-12-05',
    dayShows: 32140,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Pushpa_The_Rule_2021_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 1_642_500_000 },
      { metricType: 'gross', amount: 2_090_100_000 },
    ],
  },
  {
    title: 'Kalki 2898 AD',
    releaseDate: '2024-06-27',
    dayShows: 23838,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Project_K_2024_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 953_000_000 },
      { metricType: 'gross', amount: 1_140_200_000 },
    ],
  },
  {
    title: 'Salaar: Part 1 - Ceasefire',
    releaseDate: '2023-12-22',
    dayShows: 16824,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Salaar_2022_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'gross', amount: 1_071_000_000 },
      { metricType: 'footfalls', amount: 5_913_088 },
    ],
  },
  {
    title: 'Devara Part 1',
    releaseDate: '2024-09-27',
    dayShows: 19697,
    sourceUrl: 'https://www.sacnilk.com/quicknews/NTR_30_2022_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 825_000_000 },
      { metricType: 'gross', amount: 980_200_000 },
    ],
  },
  {
    title: 'Guntur Kaaram',
    releaseDate: '2024-01-12',
    dayShows: null,
    sourceUrl: 'https://www.sacnilk.com/quicknews/SSMB28_2022_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 413_000_000 },
      { metricType: 'gross', amount: 487_000_000 },
    ],
  },
  {
    title: 'Waltair Veerayya',
    releaseDate: '2023-01-13',
    dayShows: null,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Mega_154_2023_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 296_000_000 },
      { metricType: 'gross', amount: 346_000_000 },
    ],
  },
  {
    title: 'Bhagavanth Kesari',
    releaseDate: '2023-10-19',
    dayShows: 3790,
    sourceUrl: 'https://www.sacnilk.com/quicknews/NBK_108_2023_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 166_000_000 },
      { metricType: 'gross', amount: 190_900_000 },
    ],
  },
  {
    title: 'Hi Nanna',
    releaseDate: '2023-12-07',
    dayShows: 2519,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Nani_30_2023_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 49_000_000 },
      { metricType: 'gross', amount: 56_300_000 },
    ],
  },
  {
    title: 'Kushi',
    releaseDate: '2023-09-01',
    dayShows: 3065,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Kushi_2022_Box_Office_Collection_Day_1',
    claims: [{ metricType: 'net', amount: 152_500_000 }],
  },
  {
    title: 'Saripodhaa Sanivaaram',
    releaseDate: '2024-08-29',
    dayShows: null,
    sourceUrl: 'https://www.sacnilk.com/quicknews/Saripodhaa_Sanivaaram_2023_Box_Office_Collection_Day_1',
    claims: [
      { metricType: 'net', amount: 90_000_000 },
      { metricType: 'gross', amount: 106_500_000 },
    ],
  },
];

async function findOrCreateIndia() {
  const existing = await Location.findOne({ name: 'India', type: 'country' });
  if (existing) return existing;
  return Location.create({ name: 'India', type: 'country' });
}

async function seedReal() {
  await connectDB();

  const titles = FILMS.map((f) => f.title);
  const staleFilms = await Film.find({ title: { $in: titles } });
  const staleFilmIds = staleFilms.map((f) => f._id);
  const staleUrls = FILMS.map((f) => f.sourceUrl);

  await Promise.all([
    Collection.deleteMany({ film: { $in: staleFilmIds } }),
    Estimate.deleteMany({ film: { $in: staleFilmIds } }),
    Film.deleteMany({ _id: { $in: staleFilmIds } }),
    Source.deleteMany({ url: { $in: staleUrls } }),
  ]);

  const india = await findOrCreateIndia();

  let filmCount = 0;
  let claimCount = 0;
  let estimateCount = 0;

  for (const entry of FILMS) {
    const film = await Film.create({
      title: entry.title,
      industry: 'Tollywood',
      languages: ['Telugu'],
      releaseDate: new Date(entry.releaseDate),
      status: 'released',
    });
    filmCount += 1;

    const source = await Source.create({
      name: 'Sacnilk',
      type: 'trade_analyst',
      url: entry.sourceUrl,
      claimant: 'Sacnilk',
      datePulled: new Date(entry.releaseDate),
    });

    for (const claim of entry.claims) {
      await Collection.create({
        film: film._id,
        location: india._id,
        date: new Date(entry.releaseDate),
        dayNumber: 1,
        metricType: claim.metricType,
        scope: 'domestic',
        amount: claim.amount,
        currency: 'INR',
        isCumulative: false,
        source: source._id,
        claimant: 'Sacnilk',
      });
      claimCount += 1;
    }

    if (entry.dayShows) {
      const ceilingAmount =
        entry.dayShows * SEAT_ASSUMPTION * TICKET_PRICE_ASSUMPTION * OCCUPANCY_ASSUMPTION;
      await Estimate.create({
        film: film._id,
        location: india._id,
        date: new Date(entry.releaseDate),
        scope: 'domestic',
        method: {
          seatsCounted: SEAT_ASSUMPTION,
          showsCounted: entry.dayShows,
          ticketPriceAvg: TICKET_PRICE_ASSUMPTION,
          occupancyAssumed: OCCUPANCY_ASSUMPTION,
        },
        ceilingAmount,
        currency: 'INR',
      });
      estimateCount += 1;
    }
  }

  console.log('Seeded real Tollywood data:', {
    films: filmCount,
    claims: claimCount,
    estimates: estimateCount,
    skippedEstimates: FILMS.filter((f) => !f.dayShows).map((f) => f.title),
  });

  await disconnectDB();
}

seedReal().catch((err) => {
  console.error(err);
  process.exit(1);
});
