// The server's limits (backend/websocket/limits.js), mirrored so the client can refuse early.
export const MAX_SOURCE_BYTES = 20 * 1024; // submitted code
export const MAX_MESSAGE_BYTES = 31 * 1024; // the socket closes above 32 KB, and a dropped socket counts as a disconnect
export const MAX_ATTEMPTS = 15; // judged submissions per player per duel
