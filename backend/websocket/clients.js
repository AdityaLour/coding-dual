// Everyone connected right now: userId -> { userId, username, socket, buckets, strikes }.
export const clients = new Map();

// Looks the user up at send time, so a reply still reaches them after a socket swap.
export function sendTo(userId, message) {
  clients.get(userId)?.socket.send(JSON.stringify(message));
}
