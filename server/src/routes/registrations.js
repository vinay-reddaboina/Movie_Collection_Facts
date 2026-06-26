import express from 'express';
import { Film, Source, Collection } from '../../../shared/index.js';
import { claimInputSchema } from '../lib/claimInput.js';

const router = express.Router();

async function createClaim({ filmId, body, sourceName, sourceType }) {
  const parsed = claimInputSchema.parse(body);

  const film = await Film.findById(filmId);
  if (!film) {
    const err = new Error('Film not found');
    err.status = 404;
    throw err;
  }

  const source = await Source.create({
    name: sourceName,
    type: sourceType,
    url: parsed.url,
    claimant: parsed.claimant,
    datePulled: new Date(),
  });

  const collection = await Collection.create({
    film: film._id,
    location: parsed.locationId || null,
    date: new Date(parsed.date),
    dayNumber: parsed.dayNumber,
    metricType: parsed.metricType,
    scope: parsed.scope,
    amount: parsed.amount,
    currency: parsed.currency,
    isCumulative: parsed.isCumulative,
    source: source._id,
    claimant: parsed.claimant,
    notes: parsed.notes,
  });

  return { source, collection };
}

// A production registering its own self-reported figure. Recorded as a
// production_self_report claim - one input among several, not the answer.
router.post('/films/:id/register', async (req, res, next) => {
  try {
    const { source, collection } = await createClaim({
      filmId: req.params.id,
      body: req.body,
      sourceName: `${req.body?.claimant || 'Production'} self-report`,
      sourceType: 'production_self_report',
    });
    res.status(201).json({ source, collection });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    next(err);
  }
});

// A theatre ingesting its own attendance/occupancy figures for a date.
// Still just a claim - distinct from the public capacity data (screen
// count, seat count) the ceiling is computed from.
router.post('/films/:id/theatre-ingestion', async (req, res, next) => {
  try {
    if (!req.body?.locationId) {
      return res.status(400).json({ error: 'locationId is required for theatre ingestion' });
    }
    const { source, collection } = await createClaim({
      filmId: req.params.id,
      body: req.body,
      sourceName: `${req.body?.claimant || 'Theatre'} ingestion`,
      sourceType: 'official_registration',
    });
    res.status(201).json({ source, collection });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    next(err);
  }
});

export default router;
