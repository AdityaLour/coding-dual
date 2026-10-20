import { findSessionUser, readSessionToken, touchSession } from "../utils/session.js";

export async function requireAuth(req, res, next) {
  const token = readSessionToken(req);
  const user = await findSessionUser(token);
  if (!user) {
    return res.status(401).json({ message: "You're not logged in." });
  }
  req.user = user;
  touchSession(token, req);
  next();
}
