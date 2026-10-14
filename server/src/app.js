import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import router from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { webhook } from './controllers/paymentController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.set('query parser', (str) => {
    const params = new URLSearchParams(str);
    const query = {};
    for (const [key, value] of params.entries()) {
      if (!key || key.startsWith('$') || key.includes('.') || key.includes('[') || key === '__proto__') continue;
      query[key] = Object.prototype.hasOwnProperty.call(query, key) ? query[key] : value;
    }
    return query;
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((item) => item.trim());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(cookieParser());

  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeRequest);

  if (process.env.NODE_ENV !== 'test') {
    app.use('/api', rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please try again later.' },
    }));
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        console.log(JSON.stringify({
          level: 'info',
          method: req.method,
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          ms: Date.now() - started,
        }));
      });
      next();
    });
  }

  app.use('/uploads/public', express.static(path.resolve(__dirname, '../uploads/public')));
  app.use('/api', router);

  const clientIndex = path.resolve(__dirname, '../../client/dist/index.html');
  if (fs.existsSync(clientIndex)) {
    app.use(express.static(path.dirname(clientIndex)));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      return res.sendFile(clientIndex);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
