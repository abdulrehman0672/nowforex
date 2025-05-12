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
import ticketRoutes from './routes/ticketRoutes.js';


const app = express();
const port = process.env.PORT || 3000;


// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', (req, res, next) => {
  console.log('Uploads access:', req.path);
  next();
});

// 1. First - Body parser (CRUCIAL)
app.use(express.json());
app.use(cookieParser()); // For parsing cookies
// 2. CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Type', 'Authorization'] // Add this
}));

// 3. Configure Helmet with security policies
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for some frontend frameworks
      styleSrc: ["'self'", "'unsafe-inline'"], // Needed for inline styles
      imgSrc: ["'self'", "data:"], // Allow data URIs for images
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow loading resources
}));

// 4. Morgan logging (after body parser)
app.use(morgan('dev'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/", userRoutes);
app.use("/api/forget", forgetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/tickets', ticketRoutes);

// setInterval(() => {
//   processCompletedInvestments();
// }, 5 * 60 * 1000); // Run every 5 minutes


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  connectDB();
});