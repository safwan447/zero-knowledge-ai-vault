const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, logout, getMe } = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

// Stricter limiter just for auth routes - slows down brute-force login attempts
// without throttling the whole API for every user.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
