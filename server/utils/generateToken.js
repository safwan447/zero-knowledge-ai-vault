const jwt = require('jsonwebtoken');

/**
 * Signs a JWT carrying the minimum needed to identify and authorize a user.
 * Keep the payload small - it's decoded on every request.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      teamId: user.teamId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
