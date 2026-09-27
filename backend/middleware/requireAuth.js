import { findSessionUser, readSessionToken } from "../utils/session.js";

export async function requireAuth(req, res, next) {
  const user = await findSessionUser(readSessionToken(req));
  if (!user) {
    return res.status(401).json({ message: "You're not logged in." });
  }
  req.user = user;
  next();
}
