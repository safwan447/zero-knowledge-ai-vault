const mongoose = require('mongoose');

/**
 * One canary per team. The client encrypts a fixed known string (see
 * CANARY_PLAINTEXT in crypto.js) with whatever master secret it's given.
 * On future unlocks, the client re-encrypts... actually decrypts the
 * stored canary with the entered secret - if it comes back as the known
 * string, the secret is correct. If decryption fails, the secret is wrong.
 * This lets us catch a wrong master secret at unlock time instead of
 * failing confusingly later on a random prompt.
 */
const vaultCanarySchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
    },
    encryptedCanary: { type: String, required: true },
    iv: { type: String, required: true },
    salt: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaultCanary', vaultCanarySchema);
