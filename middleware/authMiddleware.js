// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // Check if this is a web request (expecting HTML)
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    // API request
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    console.error(error);
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};


const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export { protect, admin };