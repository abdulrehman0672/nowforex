import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Ticket from '../models/Ticket.js';
import UserInvestment from '../models/UserInvestment.js';
import User from '../models/user.js';


const router = express.Router();

// Example GET route
router.get('/', (req, res) => {
  const data = {};
  res.render('register', data);
});

router.get('/login', (req, res) => {
  res.render('login', {});
});










router.get('/withdraw', protect, async (req, res) => {
  try {

    const user = req.user;


    res.render('withdrawal', {

      user: {
        balance: user.balance

      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.redirect('/login');
  }
});













router.get('/forget-password', (req, res) => {
  res.render('forget', {});
});

router.get('/reset-password/:token', (req, res) => {
  const { token } = req.params;
  res.render('confirm', { token });
});

router.get('/home', protect, async (req, res) => {
  try {
    const tickets = await Ticket.find({ isActive: true });
    res.render('home', {
      tickets,
      user: req.user
    });
  } catch (error) {
    res.status(500).render('error', { message: error.message });
  }
});

router.get('/assets', protect, async (req, res) => {
  try {
    const ticketId = req.query.ticket;

    if (ticketId) {
      // Fetch the specific ticket from your database
      const ticket = await Ticket.findById(ticketId); // Adjust based on your DB model

      if (!ticket) {
        return res.status(404).render('assets', {
          error: 'Ticket not found',
          ticket: null
        });
      }

      return res.render('assets', {
        ticket: ticket,
        error: null
      });
    }

    // If no ticket ID provided, render empty assets page
    res.render('assets', {
      ticket: null,
      error: null
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).render('assets', {
      error: 'Error loading ticket details',
      ticket: null
    });
  }
});

router.get('/history', protect, (req, res) => {
  res.render('history', {});
});
router.get('/about', protect, (req, res) => {
  res.render('about', {});
});

router.get('/deposit', protect, (req, res) => {
  res.render('deposit', {});
});

router.get('/profile', protect, (req, res) => {
  res.render('profile', {});
});

router.get('/team', protect, (req, res) => {
  res.render('team', {});
});

export default router;
