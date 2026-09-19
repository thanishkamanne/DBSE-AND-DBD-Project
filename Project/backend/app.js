import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { testDbConnection } from './db.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import contactsRoutes from './routes/contacts.routes.js';
import sosRoutes from './routes/sos.routes.js';
import checkinsRoutes from './routes/checkins.routes.js';
import zonesRoutes from './routes/zones.routes.js';
import placesRoutes from './routes/places.routes.js';
import networkRoutes from './routes/network.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import alertsRoutes from './routes/alerts.routes.js';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  '/api',
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use('/api', express.json());
app.use('/api', cookieParser());

// 1. Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testDbConnection();

  if (dbStatus.connected) {
    return res.status(200).json({
      success: true,
      message: 'Women Safety API is running',
      database: 'connected',
    });
  }

  return res.status(503).json({
    success: false,
    message: 'Women Safety API is running',
    database: 'disconnected',
    error: dbStatus.error || 'Database connection failed',
  });
});

// 2. Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/safety-zones', zonesRoutes);
app.use('/api/safe-places', placesRoutes);
app.use('/api/safety-network', networkRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/alerts', alertsRoutes);

// 3. 404 Handler for undefined API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// 4. Global Error Handler for API
app.use('/api', (err, req, res, next) => {
  console.error('[API Server Error]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

export default app;
