const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const {
  createPrompt,
  getPrompts,
  getPromptById,
  updatePrompt,
  deletePrompt,
  getCanary,
  setCanary,
} = require('../controllers/vaultController');

const router = express.Router();

// Every vault route requires a logged-in user - apply once for the whole router
router.use(requireAuth);

router.get('/canary', getCanary);
router.post('/canary', setCanary);
router.post('/prompts', createPrompt);
router.get('/prompts', getPrompts);
router.get('/prompts/:id', getPromptById);
router.put('/prompts/:id', updatePrompt);
router.delete('/prompts/:id', deletePrompt);

module.exports = router;
