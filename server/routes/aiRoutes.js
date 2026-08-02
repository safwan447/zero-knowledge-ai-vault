const express = require('express');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/authMiddleware');
const { queryVault } = require('../controllers/aiController');

const router = express.Router();

// AI calls hit Gemini's free-tier rate limits fast, and each query re-embeds
// every stored prompt (since we don't persist embeddings) - keep this tight.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many AI queries, please slow down' },
});

router.use(requireAuth);
router.post('/query', aiLimiter, queryVault);

module.exports = router;
