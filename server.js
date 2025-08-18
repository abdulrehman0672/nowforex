import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import authRoutes from "./routes/authRoutes.js";
import forgetRoutes from "./routes/forgetRoutes.js";
import "dotenv/config";
import connectDB from './config/db.js';
import cors from 'cors';
import helmet from 'helmet'; 
import morgan from 'morgan';
import adminRoutes from './routes/adminRoutes.js';
import depositRoutes from './routes/depositRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import cookieParser from 'cookie-parser';
import { startInvestmentProcessor } from './controllers/investmentController.js';
import investmentRoutes from './routes/investmentRoutes.js';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

const app = express();
const port = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// 1. Security middleware first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "http://109.199.117.228:3000",   // allow your IP
        "https://fonts.googleapis.com"
      ],
      imgSrc: ["'self'", "data:", "https://*.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://109.199.117.228:3000"],
      frameSrc: ["'self'", "https://js.stripe.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Enable CORS before other middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://109.199.117.228:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Apply rate limiting to all requests
app.use(limiter);

// 4. Body parser and cookie parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 5. Compression middleware
app.use(compression());

// 6. Static files with cache control
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d'
}));

// 7. Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d'
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/", userRoutes);
app.use("/api/forget", forgetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/invest', investmentRoutes);

// Start investment processor
startInvestmentProcessor();

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error(err.stack);

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start server only after DB connection
connectDB().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on http://0.0.0.0:${port}`);
  });
}).catch(err => {
  console.error('Database connection failed!', err);
  process.exit(1);
});