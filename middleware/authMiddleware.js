import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Admin from '../models/admin.js'; // Add this import

const protect = async (req, res, next) => {
  let token;

  // Get token from header, cookie, or query (for image URLs)
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query.token) { // Allow token in query for image URLs
    token = req.query.token;
  }

  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle both user and admin tokens
    if (decoded.role === 'admin') {
      req.admin = await Admin.findById(decoded.id).select('-password');
    } else {
      req.user = await User.findById(decoded.userId || decoded.id).select('-password');
    }
    
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
  // Check for either req.admin (from admin login) or req.user with admin role
  if ((req.user && req.user.role === 'admin') || req.admin) {
    next();
  } else {
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// New middleware specifically for API/admin routes
const apiAdmin = (req, res, next) => {
  // Only check Authorization header for API requests
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

export { protect, admin, apiAdmin };