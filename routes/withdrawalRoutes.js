import express from 'express';
import User from '../models/user.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Apply protect middleware to all routes

// Create withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;
    
    if (!amount || !method || !accountDetails) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.withdrawalRequests.push({
      amount,
      method,
      accountDetails,
      status: 'pending'
    });

    await user.save();

    res.status(201).json({
      message: 'Withdrawal request submitted for admin approval',
      request: user.withdrawalRequests[user.withdrawalRequests.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's withdrawal history
router.get('/history', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('withdrawalRequests');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.withdrawalRequests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;