const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT stored in the httpOnly cookie and attaches the decoded
 * payload to req.user. Use this on any route that requires a logged-in user.
 */
const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, teamId }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

module.exports = requireAuth;
