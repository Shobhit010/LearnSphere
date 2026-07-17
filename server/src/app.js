const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const AppError = require('./utils/AppError');
const errorHandler = require('./middlewares/errorHandler');

// Import Routers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const lectureRoutes = require('./routes/lectureRoutes');
const progressRoutes = require('./routes/progressRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const quizRoutes = require('./routes/quizRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Turn off for local video rendering ease if needed
}));

// 2. CORS configuration (allowing client server credentials)
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        process.env.CLIENT_URL
      ].filter(Boolean);
      
      // Allow requests with no origin (like mobile apps, postman, curl) or matching origins
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// 3. Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. COOKIE PARSER
app.use(cookieParser());

// 5. MOUNT PAYMENT ROUTER BEFORE GLOBAL JSON PARSER (Stripe Webhook signature requires raw buffer)
app.use('/api/v1/payments', paymentRoutes);

// 6. GLOBAL BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 7. SERVE STATIC UPLOADS (Local fallback storage)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 8. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LearnSphere API server is running smoothly!',
    timestamp: new Date(),
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the LearnSphere API Server!',
    healthCheck: '/api/health',
  });
});

// 9. API ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/chapters', chapterRoutes);
app.use('/api/v1/lectures', lectureRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/forums', forumRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 10. HANDLE UNHANDLED ROUTES
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 11. CENTRALIZED ERROR HANDLING MIDDLEWARE
app.use(errorHandler);

module.exports = app;
