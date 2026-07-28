const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CREATE_PROMPT', 'READ_PROMPT', 'UPDATE_PROMPT', 'DELETE_PROMPT', 'AI_QUERY', 'LOGIN'],
      required: true,
    },
    // Reference to the affected PromptVault doc, if applicable
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptVault',
      default: null,
    },
    ip: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
