import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import dotenv from 'dotenv';

dotenv.config();

const tickets = [
  {
    name: "Renewable Energy Crowdfunding (Solar/Wind Farms)",
    description: "Invest in clean energy projects with high returns. Support solar and wind farm developments while earning steady profits.",
    image: "/project1.svg",
    amount: 10,
    profit: 0.25,
    validityHours: 24,
    isActive: true
  },
  {
    name: "AI-Powered Automated Trading Fund",
    description: "Leverage advanced AI algorithms for automated trading. Benefit from machine learning models that optimize investment strategies.",
    image: "/project2.svg",
    amount: 25,
    profit: 0.60,
    validityHours: 24,
    isActive: true
  },
  {
    name: "SaaS for Emerging Markets",
    description: "Invest in scalable software solutions targeting high-growth emerging markets. Low overhead with recurring revenue potential.",
    image: "/project3.svg",
    amount: 35,
    profit: 0.85,
    validityHours: 24,
    isActive: true
  },
  {
    name: "Global Real Estate Crowdfunding",
    description: "Diversify with international property investments. Earn from carefully selected commercial and residential real estate projects.",
    image: "/project4.svg",
    amount: 50,
    profit: 1.2,
    validityHours: 24,
    isActive: true
  },
  {
    name: "FourX Luxury & Rare Asset Investment",
    description: "Custom investment in high-end collectibles and rare assets. Includes art, watches, and other appreciating luxury items.",
    image: "/project5.svg",
    isCustomAmount: true,
    minCustomAmount: 100,
    maxCustomAmount: 200000,
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