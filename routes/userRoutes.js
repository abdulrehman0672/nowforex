
import express from 'express';

const router = express.Router();

// Example GET route
router.get('/', (req, res) => {
  const data = { title: 'EJS with ES Modules', message: 'Hello from EJS using ES Modules!' };
  res.render('register', data);
  });

router.get('/login', (req, res) => {
  res.render('login', {});
});

router.get('/forget-password', (req, res) => {
  res.render('forget', {});
});

router.get('/reset-password/:token', (req, res) => {
  const { token } = req.params;
  res.render('confirm', { token });
});

export default router;
