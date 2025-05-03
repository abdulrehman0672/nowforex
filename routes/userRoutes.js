import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Example GET route
router.get('/', (req, res) => {
  const data = {};
  res.render('register', data);
});

router.get('/login', (req, res) => {
  res.render('login', {});
});










router.get('/withdraw', protect, async (req, res) => {
  try {
    
    const user = req.user;

    
    res.render('withdrawal', {

      user: {
        balance: user.balance

      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.redirect('/login');
  }
});













router.get('/forget-password', (req, res) => {
  res.render('forget', {});
});

router.get('/reset-password/:token', (req, res) => {
  const { token } = req.params;
  res.render('confirm', { token });
});

router.get('/home', protect, (req, res) => {
  res.render('home', {});
});

router.get('/assets', protect, (req, res) => {
  res.render('assets', {});
});

router.get('/deposit', protect, (req, res) => {
  res.render('deposit', {});
});

router.get('/profile', protect, (req, res) => {
  res.render('profile', {});
});

router.get('/team', protect, (req, res) => {
  res.render('team', {});
});

export default router;
