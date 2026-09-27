import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api } from "@/shared/api/client.js";
import { AuthContext } from "./authContext.js";

const LOADING = { status: "loading", user: null };

// Resolves to the next auth state; never throws.
async function loadSession() {
  try {
    const data = await api("/session");
    return { status: "authed", user: data.user };
  } catch (error) {
    const unreachable =
      error instanceof ApiError && (error.status === 0 || error.status >= 500);
    return { status: unreachable ? "offline" : "guest", user: null };
  }
}

// Who is logged in. status: "loading" | "authed" | "guest" | "offline" (server unreachable).
export default function AuthProvider({ children }) {
  const [state, setState] = useState(LOADING);
  // Bumped on every explicit change. A session check started before a login/logout
  // (e.g. the page-load check racing a verify link) must not overwrite it when it lands late.
  const version = useRef(0);

  useEffect(() => {
    const started = version.current;
    loadSession().then((next) => version.current === started && setState(next));
    // StrictMode runs this twice in dev; the bump stops the first run's result from applying.
    return () => {
      version.current += 1;
    };
  }, []);

  const value = useMemo(() => {
    const set = (next) => {
      version.current += 1;
      setState(next);
    };
    return {
      ...state,
      retry: () => {
        set(LOADING);
        const started = version.current;
        loadSession().then(
          (next) => version.current === started && setState(next),
        );
      },
      signedIn: (user) => set({ status: "authed", user }),
      // Call after navigating away, so guards don't bounce the page to /login first.
      signedOut: () => set({ status: "guest", user: null }),
      logout: () => api("/logout", { method: "POST" }),
    };
  }, [state]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
