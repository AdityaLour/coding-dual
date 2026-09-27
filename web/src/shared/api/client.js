// The one way the app talks to the backend. credentials: "include" sends the session cookie;
// it's httpOnly, so this code can never read the token (which is the point).
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3000" : "");

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message ?? `Request failed (${status})`);
    this.status = status; // 0 = the server couldn't be reached
    this.data = data;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null);
  }
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

// Words for people, never raw server details.
export function errorMessage(error) {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.status === 0) {
    return "Can't reach Boip right now. Check your connection and try again.";
  }
  if (error.status >= 500)
    return "Something went wrong on our side. Try again in a moment.";
  return error.data?.message ?? "Something went wrong. Try again.";
}
