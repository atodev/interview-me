import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { interviewRoutes } from './routes/interview';
import { voiceRoutes } from './routes/voice';
import { coachingRoutes } from './routes/coaching';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { usageTracker } from './middleware/usageTracker';
import { costMonitor } from './middleware/costMonitor';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware — order matters: auth first, then rate limit, then usage tracking
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(authMiddleware);
app.use(rateLimiter);
app.use(usageTracker);
app.use(costMonitor);

// Routes
app.use('/api/interview', interviewRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/coaching', coachingRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
