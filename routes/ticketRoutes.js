import express from 'express';
import {
  getAllTickets,
  getTicketDetails,
  investInTicket
} from '../controllers/ticketController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllTickets);
router.get('/:id', getTicketDetails);
router.post('/:id/invest', protect, investInTicket);

export default router;