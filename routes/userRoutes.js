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
    const userId = req.user._id;

    // Fetch user's investments regardless of ticket query
    const investments = await UserInvestment.find({ userId })
      .populate('ticketId')
      .sort({ createdAt: -1 });

    if (ticketId) {
      // Fetch the specific ticket
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        return res.status(404).render('assets', {
          error: 'Ticket not found',
          ticket: null,
          investments, // Still show user's other investments
          user: req.user // Pass user data to the view
        });
      }

      return res.render('assets', {
        ticket,
        investments,
        error: null,
        user: req.user
      });
    }

    // If no ticket ID provided, show assets page with investments
    res.render('assets', {
      ticket: null,
      investments,
      error: null,
      user: req.user
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('assets', {
      error: 'Error loading data',
      ticket: null,
      investments: [],
      user: req.user
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

router.get('/profile', protect, async (req, res) => {
  try {
    // Get the logged-in user's data
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    res.render('profile', {
      user: {
        name: user.name,
        balance: user.balance,
        earn: user.earn,
        totalDeposits: user.totalDeposits,
        totalWithdrawals: user.totalWithdrawals,
        depositRequests: user.depositRequests,
        withdrawalRequests: user.withdrawalRequests
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Server Error');
  }
});

router.get('/team', protect, async (req, res) => {
  try {
    // Find the current user and populate their referredUsers
    const user = await User.findById(req.user._id)
      .populate({
        path: 'referredUsers',
        select: 'name username email createdAt depositRequests',
        options: { sort: { createdAt: -1 } } // Sort by newest first
      });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Calculate statistics
    const totalReferrals = user.referredUsers.length;
    const activeReferrals = user.referredUsers.filter(u => 
      u.depositRequests && u.depositRequests.some(d => d.status === 'approved')
    ).length;
    const referralEarnings = user.referredEarn || 0;

    res.render('team', {
      user: {
        ...user.toObject(), // Spread all user properties
        referralCode: user.referralCode,
        totalReferrals,
        activeReferrals,
        referralEarnings
      }
    });
  } catch (error) {
    console.error('Error fetching team data:', error);
    res.status(500).send('Server Error');
  }
});

export default router;
