import { ApiError, errorMessage } from "@/shared/api/client.js";

// Delete account is the one change not built yet: the server answers 404 and we say so plainly.
export const notReady = (error) => error instanceof ApiError && error.status === 404;

export const failText = (error, what) =>
  notReady(error) ? `${what} isn’t switched on yet. It’s coming soon.` : errorMessage(error);

// The server marks a wrong password with a code, so a signed-out 401 or another 403 is never mistaken for one.
export const wrongPassword = (error) => error instanceof ApiError && error.data?.code === "WRONG_PASSWORD";

// Seconds the server asks us to wait before sending again, from a 429.
export const waitSeconds = (error) =>
  error instanceof ApiError && error.status === 429 && Number.isFinite(error.data?.retryAfter) ? error.data.retryAfter : 0;
