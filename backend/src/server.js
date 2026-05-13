require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const morgan   = require('morgan');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/users',       require('./routes/user.routes'));
app.use('/api/restaurants', require('./routes/restaurant.routes'));
app.use('/api/menu',        require('./routes/menu.routes'));
app.use('/api/cart',        require('./routes/cart.routes'));
app.use('/api/orders',      require('./routes/order.routes'));
app.use('/api/reviews',     require('./routes/review.routes'));
app.use('/api/admin',       require('./routes/admin.routes'));

// ── Build MongoDB URI ────────────────────────────────────────
// In production (ECS): built from individual env vars injected by Copilot
// In local dev:        use MONGODB_URI directly from .env
const buildMongoURI = () => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const user = process.env.MONGO_USERNAME;
  const pass = process.env.MONGO_PASSWORD;
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || 27017;
  const db   = process.env.MONGO_DB   || 'quickbite';

  if (user && pass) {
    return `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
};

// ── MongoDB Connection ───────────────────────────────────────
mongoose.connect(buildMongoURI())
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
