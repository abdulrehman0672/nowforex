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

router.get('/assets/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const investments = await UserInvestment.find({ userId: req.user._id })
      .populate('ticketId');

    res.render('assets', {
      ticket,
      investments,
      user: req.user  // Use lowercase 'user' here for consistency
    });
  } catch (error) {
    res.status(500).render('error', { message: error.message });
  }
});

router.get('/assets', protect, async (req, res) => {
  try {
    const investments = await UserInvestment.find({ userId: req.user._id })
      .populate('ticketId');

    res.render('assets', {
      investments,
      user: req.user
    });
  } catch (error) {
    res.status(500).render('error', { message: error.message });
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
