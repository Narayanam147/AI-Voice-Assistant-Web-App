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
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  ...(env.CORS_ORIGIN ? [env.CORS_ORIGIN] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
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
