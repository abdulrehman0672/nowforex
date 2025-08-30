import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Admin from '../models/admin.js';

// Protect middleware for both user and admin
const protect = async (req, res, next) => {
  let token;

  // Check for token in header, cookie, or query (for image URLs)
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return req.accepts('html')
      ? res.redirect('/login')
      : res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If token is for admin
    if (decoded.role === 'admin') {
      req.admin = await Admin.findById(decoded.id).select('-password');
    } else {
      req.user = await User.findById(decoded.id || decoded.userId).select('-password');
    }

    if (!req.user && !req.admin) {
      throw new Error('User/Admin not found');
    }

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return req.accepts('html')
      ? res.redirect('/login')
      : res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Middleware for admin-only web pages
const admin = (req, res, next) => {
  if ((req.user && req.user.role === 'admin') || req.admin) {
    return next();
  }

  return req.accepts('html')
    ? res.redirect('/admin/login')
    : res.status(403).json({ message: 'Not authorized as an admin' });
};

// Middleware for admin-only API routes (expects Bearer token)
const apiAdmin = (req, res, next) => {
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
