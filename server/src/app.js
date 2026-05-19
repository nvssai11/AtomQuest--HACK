import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import config from './config.js';
import requestLogger from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './routes/auth.js';
import goalsRoutes from './routes/goals.js';
import approvalRoutes from './routes/approval.js';
import checkinsRoutes from './routes/checkins.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';
import cycleRoutes from './routes/cycle.js';
// import notificationsRoutes from './routes/notifications.js';

const app = express();

// 1. Security & Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// 2. Rate Limiting (Basic DDoS protection)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.apiMaxRequests,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } }
});
app.use('/api', limiter);

// 3. Parsers & Loggers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// 4. API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/goals', goalsRoutes);
apiRouter.use('/approval', approvalRoutes);
apiRouter.use('/checkins', checkinsRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/cycle', cycleRoutes);
// apiRouter.use('/notifications', notificationsRoutes);

// Health check endpoint for Render/Kubernetes
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);

// Root landing endpoint for deployments and basic health checks
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'AtomQuest Server',
    apiBase: '/api/v1',
    healthEndpoint: '/api/v1/health',
  });
});

// 5. Global Error Handling (Must be last middleware)
app.use(errorHandler);

export default app;
