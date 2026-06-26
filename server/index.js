import 'dotenv/config';
import { connectDB } from '../shared/index.js';
import { createApp } from './src/app.js';

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}

main().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
