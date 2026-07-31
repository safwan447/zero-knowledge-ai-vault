const PromptVault = require('../models/PromptVault');
const logAction = require('../utils/logAction');

/**
 * POST /api/vault/prompts
 * Body: { title, encryptedPromptText, iv, salt, tags }
 *
 * The server never sees plaintext here - the client encrypted it in the
 * browser before this request was even made. We just store what we're given.
 */
const createPrompt = async (req, res) => {
  try {
    const { title, encryptedPromptText, iv, salt, tags } = req.body;

    if (!encryptedPromptText || !iv || !salt) {
      return res.status(400).json({ message: 'encryptedPromptText, iv, and salt are required' });
    }

    const prompt = await PromptVault.create({
      userId: req.user.userId,
      teamId: req.user.teamId,
      title,
      encryptedPromptText,
      iv,
      salt,
      tags: tags || [],
    });

    await logAction({
      userId: req.user.userId,
      teamId: req.user.teamId,
      action: 'CREATE_PROMPT',
      resourceId: prompt._id,
      ip: req.ip,
    });

    return res.status(201).json({ prompt });
  } catch (err) {
    console.error('Create prompt error:', err.message);
    return res.status(500).json({ message: 'Failed to save prompt' });
  }
};

/**
 * GET /api/vault/prompts
 * Returns all prompts for the requester's team (ciphertext only - the
 * server can't decrypt these even if it wanted to).
 */
const getPrompts = async (req, res) => {
  try {
    const prompts = await PromptVault.find({ teamId: req.user.teamId })
      .sort({ createdAt: -1 })
      .limit(200); // simple cap for now; real pagination can come later if needed

    return res.status(200).json({ prompts });
  } catch (err) {
    console.error('Get prompts error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch prompts' });
  }
};

/**
 * GET /api/vault/prompts/:id
 */
const getPromptById = async (req, res) => {
  try {
    const prompt = await PromptVault.findOne({
      _id: req.params.id,
      teamId: req.user.teamId, // scoping check - a valid ID from another team returns 404, not the data
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    await logAction({
      userId: req.user.userId,
      teamId: req.user.teamId,
      action: 'READ_PROMPT',
      resourceId: prompt._id,
      ip: req.ip,
    });

    return res.status(200).json({ prompt });
  } catch (err) {
    console.error('Get prompt error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch prompt' });
  }
};

/**
 * PUT /api/vault/prompts/:id
 * Body: { title, encryptedPromptText, iv, salt, tags }
 *
 * Doesn't overwrite in place - creates a NEW PromptVault document that
 * points back to the original via parentVersion, so version history is
 * preserved. This is what powers "version templates" from the spec.
 */
const updatePrompt = async (req, res) => {
  try {
    const original = await PromptVault.findOne({
      _id: req.params.id,
      teamId: req.user.teamId,
    });

    if (!original) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    const { title, encryptedPromptText, iv, salt, tags } = req.body;
    if (!encryptedPromptText || !iv || !salt) {
      return res.status(400).json({ message: 'encryptedPromptText, iv, and salt are required' });
    }

    const newVersion = await PromptVault.create({
      userId: req.user.userId,
      teamId: req.user.teamId,
      title: title || original.title,
      encryptedPromptText,
      iv,
      salt,
      tags: tags || original.tags,
      version: original.version + 1,
      parentVersion: original._id,
    });

    await logAction({
      userId: req.user.userId,
      teamId: req.user.teamId,
      action: 'UPDATE_PROMPT',
      resourceId: newVersion._id,
      ip: req.ip,
    });

    return res.status(200).json({ prompt: newVersion });
  } catch (err) {
    console.error('Update prompt error:', err.message);
    return res.status(500).json({ message: 'Failed to update prompt' });
  }
};

/**
 * DELETE /api/vault/prompts/:id
 * Only the prompt's own creator or a team admin can delete it.
 */
const deletePrompt = async (req, res) => {
  try {
    const prompt = await PromptVault.findOne({
      _id: req.params.id,
      teamId: req.user.teamId,
    });

    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    const isOwner = prompt.userId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to delete this prompt' });
    }

    await prompt.deleteOne();

    await logAction({
      userId: req.user.userId,
      teamId: req.user.teamId,
      action: 'DELETE_PROMPT',
      resourceId: prompt._id,
      ip: req.ip,
    });

    return res.status(200).json({ message: 'Prompt deleted' });
  } catch (err) {
    console.error('Delete prompt error:', err.message);
    return res.status(500).json({ message: 'Failed to delete prompt' });
  }
};

module.exports = { createPrompt, getPrompts, getPromptById, updatePrompt, deletePrompt };
