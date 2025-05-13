import User from '../models/user.js';
import Ticket from '../models/Ticket.js';
import UserInvestment from '../models/UserInvestment.js';

// Process new investment
export const invest = async (req, res) => {
  try {
    const { ticketId, amount } = req.body;
    const userId = req.user._id; // Assuming you have user auth middleware

    // Get ticket and user
    const ticket = await Ticket.findById(ticketId);
    const user = await User.findById(userId);

    if (!ticket || !user) {
      return res.status(404).json({ message: 'Ticket or user not found' });
    }

    // Calculate expected profit
    let expectedProfit;
    if (ticket.isCustomAmount) {
      expectedProfit = amount * (ticket.profitPercentage / 100);
    } else {
      expectedProfit = ticket.profit;
    }

    // Check user balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Calculate end date
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + ticket.validityHours);

    // Create investment record
    const investment = new UserInvestment({
      userId,
      ticketId,
      amount,
      expectedProfit,
      endDate,
      status: 'active'
    });

    // Deduct amount from user balance
    user.balance -= amount;
    
    // Save changes
    await Promise.all([
      investment.save(),
      user.save()
    ]);

    res.status(201).json({ 
      message: 'Investment successful', 
      investment 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check and process completed investments
export const processCompletedInvestments = async () => {
  try {
    const now = new Date();
    
    // Find active investments that have reached their end date
    const completedInvestments = await UserInvestment.find({
      status: 'active',
      endDate: { $lte: now },
      profitPaid: false
    }).populate('userId').populate('ticketId');

    // Process each completed investment
    for (const investment of completedInvestments) {
      const user = investment.userId;
      const ticket = investment.ticketId;
      
      // Calculate actual profit (could be same as expected or calculated differently)
      let actualProfit;
      if (ticket.isCustomAmount) {
        actualProfit = investment.amount * (ticket.profitPercentage / 100);
      } else {
        actualProfit = ticket.profit;
      }

      // Update user balance and earnings
      user.balance += investment.amount + actualProfit;
      user.earn += actualProfit;

      // Update investment record
      investment.actualProfit = actualProfit;
      investment.status = 'completed';
      investment.profitPaid = true;

      // Save changes
      await Promise.all([
        user.save(),
        investment.save()
      ]);
    }
  } catch (error) {
    console.error('Error processing completed investments:', error);
  }
};

// Set up a periodic check for completed investments
export const startInvestmentProcessor = () => {
  // Check every hour (adjust as needed)
  setInterval(processCompletedInvestments, 5 * 60 * 1000);
  
  // Also run immediately on startup
  processCompletedInvestments();
};