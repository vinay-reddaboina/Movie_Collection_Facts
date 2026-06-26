import 'dotenv/config';
import cron from 'node-cron';
import { runPipeline } from './run.js';

const SCHEDULE = process.env.PIPELINE_CRON || '0 */6 * * *'; // every 6 hours by default

console.log(`Pipeline scheduled: "${SCHEDULE}"`);

cron.schedule(SCHEDULE, () => {
  console.log(`Running pipeline at ${new Date().toISOString()}`);
  runPipeline().catch((err) => console.error('Scheduled pipeline run failed:', err));
});
