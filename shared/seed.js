import 'dotenv/config';
import { connectDB, disconnectDB } from './db.js';
import Film from './models/Film.js';
import Location from './models/Location.js';
import Source from './models/Source.js';
import Collection from './models/Collection.js';
import Estimate from './models/Estimate.js';

async function seed() {
  await connectDB();

  await Promise.all([
    Film.deleteMany({}),
    Location.deleteMany({}),
    Source.deleteMany({}),
    Collection.deleteMany({}),
    Estimate.deleteMany({}),
  ]);

  const film = await Film.create({
    title: 'Dummy Blockbuster',
    industry: 'Tollywood',
    languages: ['Telugu'],
    releaseDate: new Date('2025-01-10'),
    runtimeMinutes: 155,
    productionHouses: ['Dummy Studios'],
    budget: { min: 1_500_000_000, max: 1_800_000_000, currency: 'INR' },
    status: 'released',
  });

  const india = await Location.create({ name: 'India', type: 'country' });
  const telangana = await Location.create({
    name: 'Telangana',
    type: 'state',
    parent: india._id,
    ancestors: [{ _id: india._id, name: india.name, type: india.type }],
  });
  const hyderabad = await Location.create({
    name: 'Hyderabad',
    type: 'city',
    parent: telangana._id,
    ancestors: [
      { _id: india._id, name: india.name, type: india.type },
      { _id: telangana._id, name: telangana.name, type: telangana.type },
    ],
  });
  const theatre = await Location.create({
    name: 'Prasads IMAX',
    type: 'theatre',
    parent: hyderabad._id,
    ancestors: [
      { _id: india._id, name: india.name, type: india.type },
      { _id: telangana._id, name: telangana.name, type: telangana.type },
      { _id: hyderabad._id, name: hyderabad.name, type: hyderabad.type },
    ],
    screenCount: 4,
    totalSeats: 1200,
  });

  const tradeSource = await Source.create({
    name: 'Trade Analyst Daily',
    type: 'trade_analyst',
    url: 'https://example.com/trade-analyst-daily/dummy-blockbuster-day1',
    claimant: 'Trade Analyst Daily',
    datePulled: new Date('2025-01-11'),
  });

  const selfReportSource = await Source.create({
    name: 'Dummy Studios Press Release',
    type: 'production_self_report',
    url: 'https://example.com/dummy-studios/press-release',
    claimant: 'Dummy Studios',
    datePulled: new Date('2025-01-11'),
  });

  // Two conflicting claims for the same film/date, deliberately left side by side.
  await Collection.create({
    film: film._id,
    location: india._id,
    date: new Date('2025-01-10'),
    dayNumber: 1,
    metricType: 'gross',
    scope: 'domestic',
    amount: 420_000_000,
    currency: 'INR',
    isCumulative: false,
    source: tradeSource._id,
    claimant: 'Trade Analyst Daily',
  });

  await Collection.create({
    film: film._id,
    location: india._id,
    date: new Date('2025-01-10'),
    dayNumber: 1,
    metricType: 'gross',
    scope: 'domestic',
    amount: 510_000_000,
    currency: 'INR',
    isCumulative: false,
    source: selfReportSource._id,
    claimant: 'Dummy Studios',
  });

  await Estimate.create({
    film: film._id,
    location: india._id,
    date: new Date('2025-01-10'),
    scope: 'domestic',
    method: {
      seatsCounted: 1200,
      showsCounted: 4,
      ticketPriceAvg: 200,
      occupancyAssumed: 0.85,
    },
    ceilingAmount: 1200 * 4 * 200 * 0.85,
    currency: 'INR',
    budgetRange: { min: 1_500_000_000, max: 1_800_000_000, currency: 'INR' },
  });

  console.log('Seeded:', {
    film: film.title,
    locations: [india.name, telangana.name, hyderabad.name, theatre.name],
    sources: [tradeSource.name, selfReportSource.name],
    collections: 2,
    estimates: 1,
  });

  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
