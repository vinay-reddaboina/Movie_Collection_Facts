import 'dotenv/config';
import { readFile } from 'fs/promises';
import { connectDB, disconnectDB } from '../shared/index.js';
import { fetchSources } from './src/scrape/fetchSources.js';
import { extractClaimsFromText } from './src/extract/extractClaims.js';
import { persistClaims } from './src/persist/persistClaims.js';
import { runEstimatesForFilmDate } from './src/estimate/runEstimates.js';
import { narrateDiscrepancy } from './src/narrate/narrateDiscrepancy.js';

async function loadSourceConfigs() {
  try {
    const raw = await readFile(new URL('./config/sources.json', import.meta.url));
    return JSON.parse(raw);
  } catch {
    console.warn('config/sources.json not found - copy config/sources.example.json and fill in real URLs.');
    return [];
  }
}

export async function runPipeline() {
  await connectDB();

  const sourceConfigs = await loadSourceConfigs();
  console.log(`Fetching ${sourceConfigs.length} source(s)...`);
  const fetched = await fetchSources(sourceConfigs);

  for (const page of fetched) {
    if (!page.ok) {
      console.warn(`Skipping ${page.name}: ${page.error}`);
      continue;
    }

    console.log(`Extracting claims from ${page.name}...`);
    const { valid, errors } = await extractClaimsFromText(page.rawText, { sourceName: page.name });
    if (errors.length) {
      console.warn(`${errors.length} claim(s) from ${page.name} failed validation and were dropped.`);
    }
    if (valid.length === 0) {
      console.log(`No claims found in ${page.name}.`);
      continue;
    }

    const { collections } = await persistClaims({ sourceMeta: page, claims: valid });
    console.log(`Persisted ${collections.length} claim(s) from ${page.name}.`);

    const filmDateGroups = new Map();
    for (const claim of valid) {
      const key = `${claim.filmTitle}|${claim.date}`;
      if (!filmDateGroups.has(key)) filmDateGroups.set(key, []);
      filmDateGroups.get(key).push(claim);
    }

    for (const [, claims] of filmDateGroups) {
      const [first] = claims;
      const [filmDoc] = collections.filter((c) => String(c.date) === String(new Date(first.date)));
      if (!filmDoc) continue;

      const estimates = await runEstimatesForFilmDate({
        filmId: filmDoc.film,
        date: new Date(first.date),
        scope: first.scope,
      });
      if (estimates.length === 0) {
        console.log(`No theatre capacity data on file yet for ${first.filmTitle} - skipping estimate/narration.`);
        continue;
      }

      const worldwideEstimate = estimates[estimates.length - 1];
      const { narration } = await narrateDiscrepancy({
        filmTitle: first.filmTitle,
        date: first.date,
        claims,
        ceilingAmount: worldwideEstimate.ceilingAmount,
        currency: worldwideEstimate.currency,
      });
      console.log(`Narration for ${first.filmTitle} (${first.date}): ${narration}`);
    }
  }

  await disconnectDB();
  console.log('Pipeline run complete.');
}

const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  runPipeline().catch((err) => {
    console.error('Pipeline run failed:', err);
    process.exit(1);
  });
}
