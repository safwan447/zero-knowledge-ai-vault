// Centralized so login (set) and logout (clear) always use identical options -
// mismatched options between set/clear is a classic bug where logout silently fails.
const cookieOptions = {
  httpOnly: true, // JS on the page can't read this - blocks XSS token theft
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod; allow http in local dev
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed for cross-origin (Vercel <-> Render) in prod
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, keep in sync with JWT_EXPIRES_IN
};

module.exports = cookieOptions;
