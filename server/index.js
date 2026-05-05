require('dotenv').config();
const express = require('express');
const cors = require('cors');

const placesRouter = require('./routes/places');
const visionRouter = require('./routes/vision');
const allergyRouter = require('./routes/allergy');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from local dev and the deployed Vercel frontend
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_ORIGIN, // set this on Render to your Vercel URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/places', placesRouter);
app.use('/api/vision', visionRouter);
app.use('/api/allergy', allergyRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
