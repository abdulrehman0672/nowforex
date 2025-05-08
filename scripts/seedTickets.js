// scripts/seedTickets.js
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import dotenv from 'dotenv';

dotenv.config();

const tickets = [
  {
    name: "Renewable Energy Crowdfunding (Solar/Wind Farms)",
    amount: 1500,
    profit: 33.33333333333333,
    validityHours: 24,
    isActive: true
  },
  {
    name: "AI-Powered Automated Trading Fund",
    amount: 3000,
    profit: 70,
    validityHours: 24,
    isActive: true
  },
  {
    name: "SaaS for Emerging Markets",
    amount: 5000,
    profit: 111.111111111,
    validityHours: 24,
    isActive: true
  },
  {
    name: "Global Real Estate Crowdfunding",
    amount: 10000,
    profit: 250,
    validityHours: 24,
    isActive: true
  },
  {
    name: "FourX Luxury & Rare Asset Investment",
    isCustomAmount: true,
    minCustomAmount: 100,
    maxCustomAmount: 10000,
    profitPercentage: 4,
    validityHours: 24,
    isActive: true
  }
];

async function seedTickets() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await Ticket.deleteMany({});
    console.log('Cleared existing tickets');
    
    await Ticket.insertMany(tickets);
    console.log('Successfully seeded tickets');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tickets:', error);
    process.exit(1);
  }
}

seedTickets();

