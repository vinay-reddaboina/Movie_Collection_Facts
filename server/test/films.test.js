import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { connectDB, disconnectDB, mongoose, Film, Location, Source, Collection, Estimate } from '../../shared/index.js';
import { createApp } from '../src/app.js';

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  app = createApp();
}, 60000);

afterAll(async () => {
  await disconnectDB();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
  );
});

describe('GET /api/films', () => {
  it('lists films', async () => {
    await Film.create({ title: 'A', industry: 'Tollywood', releaseDate: new Date('2025-01-01') });
    await Film.create({ title: 'B', industry: 'Bollywood', releaseDate: new Date('2025-02-01') });

    const res = await request(app).get('/api/films');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/films/:id', () => {
  it('returns claims with plausibility scored against the matching estimate', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });
    const india = await Location.create({ name: 'India', type: 'country' });
    const source = await Source.create({ name: 'Trade Site', type: 'trade_analyst' });
    const date = new Date('2025-01-10');

    await Collection.create({
      film: film._id,
      location: india._id,
      date,
      metricType: 'gross',
      scope: 'domestic',
      amount: 90,
      currency: 'INR',
      source: source._id,
      claimant: 'Trade Site',
    });

    await Estimate.create({
      film: film._id,
      location: india._id,
      date,
      scope: 'domestic',
      method: { seatsCounted: 100, showsCounted: 1, ticketPriceAvg: 1, occupancyAssumed: 1 },
      ceilingAmount: 100,
      currency: 'INR',
    });

    const res = await request(app).get(`/api/films/${film._id}`);
    expect(res.status).toBe(200);
    expect(res.body.claims).toHaveLength(1);
    expect(res.body.claims[0].plausibility.score).toBeCloseTo(0.9);
    expect(res.body.claims[0].plausibility.label).toBe('aggressive');
  });

  it('404s for an unknown film', async () => {
    const res = await request(app).get(`/api/films/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/films/:id/sources', () => {
  it('groups claims under their source', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });
    const source = await Source.create({ name: 'Trade Site', type: 'trade_analyst', url: 'https://example.com' });

    await Collection.create({
      film: film._id,
      date: new Date('2025-01-10'),
      metricType: 'gross',
      scope: 'worldwide',
      amount: 100,
      source: source._id,
      claimant: 'Trade Site',
    });

    const res = await request(app).get(`/api/films/${film._id}/sources`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].source.name).toBe('Trade Site');
    expect(res.body[0].claims).toHaveLength(1);
  });
});

describe('POST /api/films/:id/register', () => {
  it('stores a production self-report as just another claim', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });

    const res = await request(app)
      .post(`/api/films/${film._id}/register`)
      .send({
        claimant: 'Dummy Studios',
        metricType: 'gross',
        scope: 'worldwide',
        amount: 100,
        currency: 'INR',
        date: '2025-01-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.source.type).toBe('production_self_report');
    expect(res.body.collection.claimant).toBe('Dummy Studios');
  });

  it('rejects an invalid body', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });
    const res = await request(app).post(`/api/films/${film._id}/register`).send({ amount: -5 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/films/:id/theatre-ingestion', () => {
  it('requires a locationId', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });
    const res = await request(app)
      .post(`/api/films/${film._id}/theatre-ingestion`)
      .send({ claimant: 'Theatre X', metricType: 'occupancy', scope: 'domestic', amount: 0.8, date: '2025-01-10' });
    expect(res.status).toBe(400);
  });

  it('stores theatre-reported occupancy as a claim, not as the ceiling input', async () => {
    const film = await Film.create({ title: 'Dummy', industry: 'Tollywood', releaseDate: new Date('2025-01-10') });
    const theatre = await Location.create({ name: 'Prasads', type: 'theatre', totalSeats: 1000 });

    const res = await request(app)
      .post(`/api/films/${film._id}/theatre-ingestion`)
      .send({
        claimant: 'Theatre X',
        metricType: 'occupancy',
        scope: 'domestic',
        amount: 0.8,
        date: '2025-01-10',
        locationId: String(theatre._id),
      });

    expect(res.status).toBe(201);
    expect(res.body.source.type).toBe('official_registration');
  });
});
