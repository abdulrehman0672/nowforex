import express from 'express';
import User from '../models/user.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({userId} ,process.env.JWT_SECRET, {expiresIn: '15d'});
  };



router.post('/register', async (req, res) => {
  try {
    const {username, name, email, password, referralCode} = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({message:'All fields are required'});
    }
    if (password.length < 6) {
      return res.status(400).json({message:'Password must be at least 6 characters'});
    }
    if (username.length < 5) {
      return res.status(400).json({message:'Username must be at least 5 characters'});
    }

    // Check if user already exists
    const existingemail = await User.findOne({email});
    if (existingemail) {
      return res.status(400).json({message:'Email already exists'});
    }
    const existingUsername = await User.findOne({username});
    if (existingUsername) {
      return res.status(400).json({message:'Username already exists'});
    }

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
      if (!referredByUser) {
        return res.status(400).json({ message: 'Invalid referral code' });
      }
    }

    // Create a new user
    const user = new User({ 
      username, 
      name, 
      email, 
      password, 
      referredBy: referredByUser ? referredByUser._id : null 
    });
    await user.save();
    
    // If referral code was used, just add to referredUsers (no bonus yet)
    if (referredByUser) {
      await User.findByIdAndUpdate(referredByUser._id, {
        $push: {
          referredUsers: user._id
        }
      });
    }
    
    const token = generateToken(user._id);
    res.status(201).json({
      token,
      User:{
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    console.log("Error in the auth Routes", error);
    res.status(500).json({message:'auth Router Server Error'});
  }
});

router.post('/login', async (req, res) => {
  try {
   const {email, password} = req.body;
   if (!email || !password) {
     return res.status(400).json({message:'All fields are required'});
   }
   const user = await User.findOne({email});
   if (!user) {
     return res.status(400).json({message:'Invalid Email'});
   }
   // Check if password is correct
   const isMatch = await user.matchPassword(password);
   if (!isMatch) return res.status(400).json({message:'Invalid Password'});
   const token = generateToken(user._id);
 
   // Set the token in an HTTP-only cookie
   res.cookie('token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
   });
 
   res.status(200).json({
     token,
     User:{
       id: user._id,
       username: user.username,
       name: user.name,
       email: user.email,
     }
   });
  } catch (error) {
     console.log("Error in the auth Routes Login", error);
     res.status(500).json({message:'Server Error'});
  }
 });
 
 // Logout route
 router.post('/logout', (req, res) => {
   try {
     res.clearCookie('token', {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
     });
 
     res.status(200).json({ message: 'Logout successful. Token cookie cleared.' });
   } catch (error) {
     console.error("Error during logout:", error);
     res.status(500).json({ message: 'Server Error during logout' });
   }
 });

export default router;