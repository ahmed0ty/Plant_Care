import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { plantsRouter } from './routes/plants';
import { tasksRouter } from './routes/tasks';
import { dashboardRouter } from './routes/dashboard';
import { errorHandler, notFound } from './middleware/error';
import { imagesRouter } from './routes/images';
import { statsRouter } from './routes/stats';
import { galleryRouter } from './routes/gallery';
import { settingsRouter } from './routes/settings';
import { checkOrigin } from './middleware/origin';
export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', checkOrigin);
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/images', imagesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/settings', settingsRouter);
app.use(notFound);
app.use(errorHandler);