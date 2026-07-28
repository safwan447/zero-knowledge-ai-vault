const mongoose = require('mongoose');

const promptVaultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'Untitled Prompt',
    },
    // AES-GCM ciphertext, base64-encoded. Server never sees plaintext at rest.
    encryptedPromptText: {
      type: String,
      required: true,
    },
    // Base64-encoded initialization vector used for this ciphertext
    iv: {
      type: String,
      required: true,
    },
    // Base64-encoded PBKDF2 salt used to derive the AES key client-side
    salt: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    // Points to the previous version of this prompt, if any (simple version chain)
    parentVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptVault',
      default: null,
    },
  },
  { timestamps: true }
);

promptVaultSchema.index({ teamId: 1, createdAt: -1 });

module.exports = mongoose.model('PromptVault', promptVaultSchema);
