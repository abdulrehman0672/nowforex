import mongoose from 'mongoose';

const userInvestmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  expectedProfit: {
    type: Number,
    required: true
  },
  actualProfit: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserInvestment = mongoose.model('UserInvestment', userInvestmentSchema);

export default UserInvestment;