import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    required: true
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: function() { return !this.isCustomAmount; },
    min: 0
  },
  profit: {
    type: Number,
    required: function() { return !this.isCustomAmount; },
    min: 0
  },
  validityHours: {
    type: Number,
    required: true,
    default: 24
  },
  isCustomAmount: {
    type: Boolean,
    default: false
  },
  minCustomAmount: {
    type: Number,
    default: 0
  },
  maxCustomAmount: {
    type: Number
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;