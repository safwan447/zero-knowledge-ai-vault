const argon2 = require('argon2');
const User = require('../models/User');
const Team = require('../models/Team');
const generateToken = require('../utils/generateToken');
const cookieOptions = require('../utils/cookieOptions');

/**
 * POST /api/auth/register
 * Body: { email, password, teamName?, inviteCode? }
 *
 * - If inviteCode is provided: user joins that team as 'member'
 * - If inviteCode is NOT provided: a new team is created, user becomes 'admin'
 */
const register = async (req, res) => {
  try {
    const { email, password, teamName, inviteCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    let team;
    let role;

    if (inviteCode) {
      // Joining an existing team
      team = await Team.findOne({ inviteCode });
      if (!team) {
        return res.status(404).json({ message: 'Invalid invite code' });
      }
      role = 'member';
    } else {
      // Creating a brand new team - this user becomes its admin.
      // We create the user first (without teamId) is awkward since teamId is required,
      // so we create the Team with a placeholder ownerId, then the User, then patch ownerId.
      if (!teamName) {
        return res.status(400).json({ message: 'teamName is required when creating a new team' });
      }
      team = new Team({ name: teamName, ownerId: null });
      role = 'admin';
    }

    const passwordHash = await argon2.hash(password);

    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role,
      teamId: team._id,
    });

    if (!inviteCode) {
      team.ownerId = user._id;
      await team.save();
    }

    await user.save();

    const token = generateToken(user);
    res.cookie('token', token, cookieOptions);

    return res.status(201).json({
      message: 'Registered successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
      // Only surfaced on team creation - the admin needs this to invite teammates.
      ...(role === 'admin' && { teamInviteCode: team.inviteCode }),
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // passwordHash has `select: false` in the schema, so we explicitly request it here
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      // Same generic message as a wrong password - don't reveal which part was wrong
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Login failed' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('token', cookieOptions);
  return res.status(200).json({ message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me
 * Requires requireAuth middleware to have run first.
 * Lets the frontend check "am I logged in, and as who" on page load.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (err) {
    console.error('GetMe error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
};

module.exports = { register, login, logout, getMe };
