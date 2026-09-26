// CSRF defence (alongside SameSite=Lax): state-changing requests must come from our own frontend.
export function requireSameOrigin(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS")
    return next();
  if (req.get("origin") !== process.env.APP_ORIGIN) {
    return res.status(403).json({ message: "Request blocked." });
  }
  next();
}
