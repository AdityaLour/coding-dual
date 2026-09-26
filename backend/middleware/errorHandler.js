// Last middleware: generic messages to the client, details only in server logs.
export function handleErrors(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request body." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request too large." });
  }
  console.error(error);
  res.status(500).json({ message: "Something went wrong." });
}
