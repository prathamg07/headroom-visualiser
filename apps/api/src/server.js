import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load .env from root
dotenv.config({ path: '../../.env' });

import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import accountsRoutes from './routes/accounts.js';
import categoriesRoutes from './routes/categories.js';
import transactionsRoutes from './routes/transactions.js';
import recurrencesRoutes from './routes/recurrences.js';
import projectionRoutes from './routes/projection.js';
import importsRoutes from './routes/imports.js';
import groupsRoutes from './routes/groups.js';
import budgetsRoutes from './routes/budgets.js';
import incomeRoutes from './routes/income.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'headroom-api', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/recurrences', recurrencesRoutes);
app.use('/api/projection', projectionRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/income', incomeRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Headroom API running at http://localhost:${PORT}`);
    console.log(`📡 Connected to database at ${process.env.DATABASE_URL || 'default port 8000'}`);
  });
}

export default app;
