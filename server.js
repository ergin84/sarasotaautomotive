const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
// In production, also load .env.production if present (deploy renames it to .env; this is a fallback)
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env.production') });
}

const User = require('./models/User');

const app = express();

// Rate limiters
// Strict limiter for auth endpoints (login, forgot-password, init-admin)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes.' }
});

// General limiter for public write endpoints (contact form, rental inquiry)
const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Middleware
const allowedOrigins = [
  'https://sarasotaautomotive.com',
  'https://www.sarasotaautomotive.com',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [])
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Apply rate limiting to auth and public write endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/init-admin', authLimiter);
app.use('/api/contact', publicWriteLimiter);
app.use('/api/rentals/inquiry', publicWriteLimiter);

// Routes - API routes must come before the catch-all route
// Note: Order matters - more specific routes should come first
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/site-settings', require('./routes/siteSettings'));
app.use('/api/services', require('./routes/services'));
app.use('/feeds', require('./routes/feeds'));

// Serve static files and handle client-side routing (only for GET requests)
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  // For API routes, return JSON
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  
  // For other routes, return HTML error page or redirect
  res.status(err.status || 500).send('Internal Server Error');
});

// Database connection
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarasota_automotive';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const smtpOk = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    console.log(smtpOk ? 'Mail (SMTP): configured' : 'Mail (SMTP): not configured (set SMTP_USER, SMTP_PASS in .env.deploy and redeploy)');

    // Initialize admin user if it doesn't exist
    try {
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const admin = new User({
          username: process.env.ADMIN_USERNAME || 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
          role: 'admin'
        });
        await admin.save();
        console.log('Admin user created:', process.env.ADMIN_USERNAME || 'admin');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error.message);
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });


