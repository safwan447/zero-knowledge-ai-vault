const mongoose = require('mongoose');
const crypto = require('crypto');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Shared code new members use to join this team on registration.
    // Not a secret in the crypto sense, just an access gate - rotate if leaked.
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'), // e.g. "a3f9c1d84e2b"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
