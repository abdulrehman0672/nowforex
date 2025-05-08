import express from 'express';
import User from '../models/user.js';
import Admin from '../models/admin.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {apiAdmin} from '../middleware/authMiddleware.js'; // Import the new middleware
import Ticket from '../models/Ticket.js';
import UserInvestment from '../models/UserInvestment.js';

const router = express.Router();

// Get directory path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads'); 
console.log('Upload directory:', uploadDir);


router.get('/uploads/:filename', apiAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    
    // Enhanced security validation
    if (!filename || !/^[0-9a-f-]+\.(png|jpg|jpeg|gif)$/i.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }

    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Set cache-control headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
    
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving proof image:', error);
    res.status(500).json({ message: 'Error serving image' });
  }
});

// Update the pending deposits route
router.get('/deposits/pending', apiAdmin, async (req, res) => {
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
          // Add this line to ensure proper URL format:
          proofImage: deposit.proofImage ? `${deposit.proofImage}` : null,
          amount: deposit.amount,
          method: deposit.method,
          transactionId: deposit.transactionId,
          createdAt: deposit.createdAt,
          _id: deposit._id
        }))
    );

    console.log('Sending pending deposits:', pendingDeposits[0]?.proofImage); // Debug log
    res.json(pendingDeposits);
  } catch (error) {
    console.error('Error fetching pending deposits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


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
router.get('/deposits/pending', apiAdmin, async (req, res) => {
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
          proofImageUrl: `/uploads/${deposit.proofImage}`,
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

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal request already processed' });
    }

    if (action === 'approve') {
      withdrawal.status = 'approved';
      user.totalWithdrawals += withdrawal.amount;
      await user.save();
      return res.json({ 
        message: 'Withdrawal approved successfully',
        userBalance: user.balance
      });
    } else if (action === 'reject') {
      // Return the amount to user's balance
      user.balance += withdrawal.amount;
      withdrawal.status = 'rejected';
      await user.save();
      return res.json({ 
        message: 'Withdrawal rejected',
        userBalance: user.balance
      });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Withdrawal processing error:', error);
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

router.get('/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new ticket
router.post('/createtickets', async (req, res) => {
  try {
    const {
      name,
      description,
      amount,
      profit,
      validityHours,
      isCustomAmount,
      minCustomAmount,
      maxCustomAmount,
      profitPercentage,
      isActive
    } = req.body;

    const ticketData = {
      name,
      description: description || '',
      validityHours: validityHours || 24,
      isActive: isActive !== false,
      isCustomAmount: isCustomAmount || false
    };

    if (isCustomAmount) {
      ticketData.minCustomAmount = minCustomAmount || 0;
      ticketData.maxCustomAmount = maxCustomAmount;
      ticketData.profitPercentage = profitPercentage;
    } else {
      ticketData.amount = amount;
      ticketData.profit = profit;
    }

    const ticket = new Ticket(ticketData);
    await ticket.save();

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket
router.put('/updatetickets/:id',  async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const {
      name,
      description,
      amount,
      profit,
      validityHours,
      isCustomAmount,
      minCustomAmount,
      maxCustomAmount,
      profitPercentage,
      isActive
    } = req.body;

    ticket.name = name;
    ticket.description = description || '';
    ticket.validityHours = validityHours || 24;
    ticket.isActive = isActive !== false;
    ticket.isCustomAmount = isCustomAmount || false;

    if (isCustomAmount) {
      ticket.amount = undefined;
      ticket.profit = undefined;
      ticket.minCustomAmount = minCustomAmount || 0;
      ticket.maxCustomAmount = maxCustomAmount;
      ticket.profitPercentage = profitPercentage;
    } else {
      ticket.amount = amount;
      ticket.profit = profit;
      ticket.minCustomAmount = undefined;
      ticket.maxCustomAmount = undefined;
      ticket.profitPercentage = undefined;
    }

    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete ticket
router.delete('/deletetickets/:id', async (req, res) => {
  try {
    // Check if there are any active investments with this ticket
    const activeInvestments = await UserInvestment.countDocuments({
      ticketId: req.params.id,
      status: 'active'
    });

    if (activeInvestments > 0) {
      return res.status(400).json({
        message: 'Cannot delete ticket with active investments'
      });
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active user investments
router.get('/investments', async (req, res) => {
  try {
    const investments = await UserInvestment.find()
      .populate('userId', 'username name email')
      .populate('ticketId', 'name')
      .sort({ startDate: -1 });

    res.json(investments);
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;