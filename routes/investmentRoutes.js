// routes/investmentRoutes.js
import express from 'express';
import { invest } from '../controllers/investmentController.js';
import { protect } from '../middleware/authMiddleware.js'; // Your auth middleware

const router = express.Router();

router.post('/investment', protect, invest);

export default router;