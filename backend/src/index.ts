import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import userOperationRoutes from './routes/userOperation';

const app = express();

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(
  cors({
    origin: ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      bundler: 'ok',
      paymaster: 'ok',
    },
  });
});

app.use('/api', userOperationRoutes);

app.use(errorHandler);

// Export app for testing
export { app };

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`
🚀 Account Abstraction Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Environment: ${NODE_ENV}
  Port:        ${PORT}
  CORS:        ${ALLOWED_ORIGINS}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Health Check: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  });
}
