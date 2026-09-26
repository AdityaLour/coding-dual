import {
  SESSION_COOKIE,
  clearSessionCookie,
  findSessionUser,
} from "../utils/session.js";

// Puts the logged-in user on req.user, or answers 401.
export async function requireAuth(req, res, next) {
  const user = await findSessionUser(req.cookies?.[SESSION_COOKIE]);
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ message: "You're not logged in." });
  }
  req.user = user;
  next();
}
