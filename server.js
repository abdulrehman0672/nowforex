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

// Security headers configuration - COMPLETELY DISABLED for HTTP
app.use((req, res, next) => {
  // Remove all problematic headers
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
});

// Minimal helmet configuration
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false
}));

// CORS configuration
app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true
}));

// Apply rate limiting to all requests
app.use(limiter);

// Body parser and cookie parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Static files with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enhanced static files middleware with forced HTTP links
app.use((req, res, next) => {
  if (req.path.match(/\.(css|js|svg|png|jpg)$/)) {
    // Ensure no HTTPS redirect attempts
    res.removeHeader('Strict-Transport-Security');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  setHeaders: (res, path) => {
    // Set proper Content-Type
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    }
    // Force HTTP links in HTML responses
    res.locals.assetPath = (file) => `http://109.199.117.228:3000/${file}`;
  }
}));

// Logging
app.use(morgan('dev'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to force HTTP links in templates
app.use((req, res, next) => {
  res.locals.assetPath = (file) => `http://${req.headers.host}/${file}`;
  next();
});

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

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server startup
connectDB().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server running on http://109.199.117.228:${port}`);
    console.log(`✅ Static files available at:`);
    console.log(`   - http://109.199.117.228:${port}/output.css`);
    console.log(`   - http://109.199.117.228:${port}/logo.svg`);
  });
}).catch(err => {
  console.error('Database connection failed!', err);
  process.exit(1);
});