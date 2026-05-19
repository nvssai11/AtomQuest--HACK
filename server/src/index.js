import app from './app.js';
import { seedStore } from './store/seed.js';

// Seed initial in-memory data
await seedStore();

// Export app for Vercel serverless deployment
export default app;