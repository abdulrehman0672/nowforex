import express from 'express';
import User from '../models/user.js';
import Admin from '../models/admin.js';
import jwt from 'jsonwebtoken';


const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // More detailed validation
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Case-insensitive search
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!admin) {
      console.log(`Login attempt for non-existent admin: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Debug password comparison
    console.log(`Stored hash: ${admin.password}`);
    console.log(`Input password: ${password}`);
    const isMatch = await admin.matchPassword(password);
    console.log(`Password match: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Token generation
    const token = jwt.sign(
      {
        id: admin._id,
        role: 'admin',
        username: admin.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all pending deposits
router.get('/deposits/pending', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({
      'depositRequests.status': 'pending'
    }).select('username name depositRequests');

    const pendingDeposits = users.flatMap(user => 
      user.depositRequests
        .filter(deposit => deposit.status === 'pending')
        .map(deposit => ({
          userId: user._id,
          username: user.username,
          name: user.name,
          proofImage: deposit.proofImage,
          ...deposit.toObject()
        }))
    );

    res.json(pendingDeposits);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject deposit
router.put('/deposits/:depositId', verifyAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const user = await User.findOne({
      'depositRequests._id': depositId
    });

    if (!user) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    const deposit = user.depositRequests.id(depositId);
    if (!deposit) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (action === 'approve') {
      deposit.status = 'approved';
      user.balance += deposit.amount;
      user.totalDeposits += deposit.amount;
      await user.save();
      return res.json({ message: 'Deposit approved successfully' });
    } else if (action === 'reject') {
      deposit.status = 'rejected';
      await user.save();
      return res.json({ message: 'Deposit rejected' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending withdrawals
router.get('/withdrawals/pending', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({
      'withdrawalRequests.status': 'pending'
    }).select('username name withdrawalRequests balance');

    const pendingWithdrawals = users.flatMap(user => 
      user.withdrawalRequests
        .filter(withdrawal => withdrawal.status === 'pending')
        .map(withdrawal => ({
          userId: user._id,
          username: user.username,
          name: user.name,
          currentBalance: user.balance,
          ...withdrawal.toObject()
        }))
    );

    res.json(pendingWithdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject withdrawal
router.put('/withdrawals/:withdrawalId', verifyAdmin, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const user = await User.findOne({
      'withdrawalRequests._id': withdrawalId
    });

    if (!user) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    const withdrawal = user.withdrawalRequests.id(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (action === 'approve') {
      if (user.balance < withdrawal.amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      withdrawal.status = 'approved';
      user.balance -= withdrawal.amount;
      user.totalWithdrawals += withdrawal.amount;
      await user.save();
      return res.json({ message: 'Withdrawal approved successfully' });
    } else if (action === 'reject') {
      withdrawal.status = 'rejected';
      await user.save();
      return res.json({ message: 'Withdrawal rejected' });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin', (req, res) => {
  res.render('admin', {});
});


export default router;