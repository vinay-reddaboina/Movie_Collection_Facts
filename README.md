# Movie Collection Facts

A film collection transparency dashboard for Indian cinema. Box office numbers reported to the
public are routinely inflated — gross quoted as share, worldwide padded into domestic, Day 1
figures no theatre count could physically produce — and there's no regulator forcing disclosure.
This project doesn't claim to know the "real" number. It makes collections *transparent*: every
figure traces to its source, every total is computed bottom-up so levels can't silently
contradict each other, and conflicting claims sit side by side instead of being flattened into
one confident number.

Three figures sit next to each other for every film: what the production self-reports, what
independent trade sources claim, and a **computed ceiling** — screens × shows × seats × ticket
price × occupancy, summed bottom-up through a location tree and compared against the claims as a
plausibility score. Every number on screen is tappable to its source and method.

## Architecture

```
/client    React dashboard (Vite)
/server    Express read API
/pipeline  Scheduled scrape -> LLM extract -> persist -> estimate -> narrate job
/shared    Mongoose models, DB connection helper, and the estimation engine
```

The estimation engine (`/shared/estimation`) is pure math with no DB or network dependency —
`computeCeiling`, `rollupCeilings`, `plausibilityScore` — so it's reused by both the pipeline
(writing estimates) and the API (scoring claims against them on read).

## Setup

1. **MongoDB Atlas**: create a free cluster at https://www.mongodb.com/cloud/atlas and grab the
   connection string. This is the one step only you can do — it needs your own account.
2. Copy `.env.example` to `.env` in both `/server` and `/pipeline`, fill in `MONGO_URI` (and
   `LLM_API_KEY` for the pipeline).
3. Install dependencies in each package:
   ```
   cd shared && npm install
   cd ../server && npm install
   cd ../pipeline && npm install
   cd ../client && npm install
   ```
4. Seed dummy data to confirm the models hold together:
   ```
   cd shared && node seed.js
   ```
   To seed real, sourced data instead — 10 real Telugu-industry films with real Day 1 India
   box-office claims cited to Sacnilk — run `cd shared && node seedReal.js`. Claims are exactly
   what was published; nothing is invented. Ceilings are computed only for the films where a real
   Day 1 show count was reported — the other three are seeded with claims but no Estimate rather
   than a guessed show count. Even where a real show count exists, seats-per-show (360) and
   ticket price (₹180) are documented industry-average approximations (see comments in
   `seedReal.js`), not per-theatre verified figures — visible in full via each Estimate's `method`
   on the detail page.
5. Run the stack:
   ```
   cd server && npm run dev      # API on :4000
   cd client && npm run dev      # dashboard on :5173, set VITE_API_URL if not :4000
   ```
6. Run the pipeline once `config/sources.json` (copied from `config/sources.example.json`) has
   real source URLs and `LLM_API_KEY` is set:
   ```
   cd pipeline && npm start
   ```

## Testing

Each package owns its own tests:
```
cd shared && npm test     # estimation engine: ceiling, rollup, plausibility
cd server && npm test     # API integration tests against an in-memory Mongo
```

## Deployment

- **Client → Vercel**: point a Vercel project at `/client`, framework preset Vite. `vercel.json`
  rewrites all routes to `index.html` so React Router's client-side routes work on refresh. Set
  `VITE_API_URL` to the deployed API's URL.
- **Server → Render/Railway**: `render.yaml` at the repo root defines the API as a web service
  rooted at `/server`. On Railway, create a service pointed at `/server` with `npm start`.
  Set `MONGO_URI` and `CLIENT_ORIGIN` as service secrets — never commit them.
- **Pipeline → scheduled job**: `render.yaml` also defines a Render cron service rooted at
  `/pipeline` running every 6 hours (`pipeline/schedule.js` is the equivalent if you'd rather run
  it as a long-lived process with `node-cron` instead of a platform cron trigger).
- All secrets (`MONGO_URI`, `LLM_API_KEY`) live only in server-side env vars — the client only
  ever gets a public API URL.

## Data model

- **Film** — title, industry, release date, budget range.
- **Location** — theatre → city → state → country → worldwide tree, using the ancestors-array
  pattern so "everything under this state" is one indexed query instead of a recursive walk.
- **Source** — provenance for every claim: who, where, when pulled, and the exchange rate used if
  a figure was currency-converted.
- **Collection** — one claim, pinned to its Source. Never overwritten or merged with conflicting
  claims for the same film/date — that's the whole point.
- **Estimate** — a computed ceiling for a film/location/date, with the seats/shows/price/occupancy
  that produced it recorded alongside, so the method is as inspectable as the number.
