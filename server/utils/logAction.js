const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit logging. Failures here are logged but never block
 * the actual request - an audit trail gap is bad, but not as bad as an
 * outage caused by logging infrastructure.
 */
const logAction = async ({ userId, teamId, action, resourceId = null, ip = null }) => {
  try {
    await AuditLog.create({ userId, teamId, action, resourceId, ip });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = logAction;
