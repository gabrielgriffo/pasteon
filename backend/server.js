import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import endpointsRouter from './routes/endpoints.js';
import responseFieldsRouter from './routes/responseFields.js';
import requestGroupsRouter from './routes/requestGroups.js';
import aiSettingsRouter from './routes/aiSettings.js';
import dictionaryRouter from './routes/dictionary.js';
import failedRequestsRouter from './routes/failedRequests.js';
import manualDocsRouter from './routes/manualDocs.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support large JSON payloads
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// API Routes
app.use('/api/endpoints', endpointsRouter);
app.use('/api/response-fields', responseFieldsRouter);
app.use('/api/request-groups', requestGroupsRouter);
app.use('/api/ai-settings', aiSettingsRouter);
app.use('/api/dictionary', dictionaryRouter);
app.use('/api/failed-requests', failedRequestsRouter);
app.use('/api/manual-docs', manualDocsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${corsOptions.origin}`);
});
