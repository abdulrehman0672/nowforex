import Ticket from '../models/Ticket.js';
import User from '../models/user.js';
import UserInvestment from '../models/UserInvestment.js';

// Get all active tickets
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ isActive: true });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single ticket details
export const getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Invest in a ticket
export const investInTicket = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const ticketId = req.params.id;

    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if amount meets minimum investment
    if (amount < ticket.minInvestment) {
      return res.status(400).json({ 
        message: `Minimum investment is ${ticket.minInvestment}` 
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check user balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Calculate expected profit
    const expectedProfit = (amount * ticket.roi) / 100;

    // Create investment
    const investment = new UserInvestment({
      userId,
      ticketId,
      amount,
      expectedProfit,
      endDate: new Date(Date.now() + ticket.validityHours * 60 * 60 * 1000),
      status: 'active'
    });

    // Deduct from user balance
    user.balance -= amount;
    
    // Update ticket investment info
    ticket.totalInvestment += amount;
    ticket.remainingSlots -= 1;

    // Save all changes
    await Promise.all([
      investment.save(),
      user.save(),
      ticket.save()
    ]);

    res.status(201).json({ 
      message: 'Investment successful',
      investment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Process completed investments
export const processCompletedInvestments = async () => {
  try {
    const now = new Date();
    const completedInvestments = await UserInvestment.find({
      endDate: { $lte: now },
      status: 'active'
    }).populate('userId ticketId');

    for (const investment of completedInvestments) {
      const { userId, ticketId, amount, expectedProfit } = investment;
      
      // Add profit to user's balance and earnings
      userId.balance += amount + expectedProfit;
      userId.earnings += expectedProfit;
      
      // Update investment status
      investment.actualProfit = expectedProfit;
      investment.status = 'completed';
      
      await Promise.all([
        userId.save(),
        investment.save()
      ]);
    }
    
    console.log(`Processed ${completedInvestments.length} completed investments`);
  } catch (error) {
    console.error('Error processing completed investments:', error);
  }
};