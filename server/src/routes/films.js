import express from 'express';
import { Film, Collection, Estimate, plausibilityScore, classifyPlausibility } from '../../../shared/index.js';
import { matchEstimateForCollection } from '../lib/matchEstimate.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const films = await Film.find().sort({ releaseDate: -1 }).lean();
    res.json(films);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const film = await Film.findById(req.params.id).lean();
    if (!film) return res.status(404).json({ error: 'Film not found' });

    const [collections, estimates] = await Promise.all([
      Collection.find({ film: film._id }).populate('location', 'name type').sort({ date: 1 }).lean(),
      Estimate.find({ film: film._id }).populate('location', 'name type').sort({ date: 1 }).lean(),
    ]);

    // footfalls/occupancy are counts and percentages, not currency - scoring
    // them against an INR ceiling is meaningless, so only gross/net/share
    // claims get compared.
    const MONETARY_METRIC_TYPES = new Set(['gross', 'net', 'share']);

    const claims = collections.map((collection) => {
      const estimate = MONETARY_METRIC_TYPES.has(collection.metricType)
        ? matchEstimateForCollection(collection, estimates)
        : null;
      const score = estimate ? plausibilityScore(collection.amount, estimate.ceilingAmount) : null;
      return {
        ...collection,
        plausibility: score === null ? null : { score, label: classifyPlausibility(score) },
        comparedAgainstEstimate: estimate ? estimate._id : null,
      };
    });

    res.json({ film, claims, estimates });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/sources', async (req, res, next) => {
  try {
    const film = await Film.findById(req.params.id).lean();
    if (!film) return res.status(404).json({ error: 'Film not found' });

    const collections = await Collection.find({ film: film._id })
      .populate('source')
      .populate('location', 'name type')
      .lean();

    const sourcesById = new Map();
    for (const collection of collections) {
      const source = collection.source;
      if (!source) continue;
      const key = String(source._id);
      if (!sourcesById.has(key)) {
        sourcesById.set(key, { source, claims: [] });
      }
      sourcesById.get(key).claims.push({
        collectionId: collection._id,
        date: collection.date,
        metricType: collection.metricType,
        scope: collection.scope,
        amount: collection.amount,
        currency: collection.currency,
        location: collection.location,
      });
    }

    res.json(Array.from(sourcesById.values()));
  } catch (err) {
    next(err);
  }
});

export default router;
