import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { sanitizeRequest } from './middleware/mongo-sanitize';
import chatRoutes from './modules/chat/chat.routes';
import paymentRoutes from './modules/payments/payments.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());

// Stripe webhook needs raw body
app.use('/api/payments/webhook', paymentRoutes);

app.use(express.json());
app.use(sanitizeRequest());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log(`  Auth: Bearer ${req.headers.authorization.slice(7, 20)}...`);
  } else {
    console.log('  Auth: NONE');
  }
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

export default app;
