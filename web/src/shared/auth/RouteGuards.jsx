import { Navigate, Outlet, useLocation, useOutletContext } from "react-router";
import PageLoader from "@/shared/ui/PageLoader.jsx";
import ServerUnavailable from "@/shared/ui/ServerUnavailable.jsx";
import { useAuth } from "./useAuth.js";

// Guards sit between a layout and its pages, so they pass the layout's outlet context through.

// Pages that need a session. Accounts without a username are sent to pick one first.
export function RequireAuth({ allowMissingUsername = false }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const context = useOutletContext();

  if (status === "loading") return <PageLoader />;
  if (status === "offline") return <ServerUnavailable />;
  if (status === "guest")
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.username && !allowMissingUsername)
    return <Navigate to="/welcome" replace />;
  return <Outlet context={context} />;
}

// Landing, login, signup: shown straight away (no loader flash); once a session is known,
// logged-in people go where they were headed. "from" comes from router state, never the URL,
// so it can't be used as an open redirect.
export function GuestOnly() {
  const { status, user } = useAuth();
  const location = useLocation();
  const context = useOutletContext();

  if (status !== "authed") return <Outlet context={context} />;
  if (!user.username) return <Navigate to="/welcome" replace />;
  return <Navigate to={location.state?.from?.pathname ?? "/home"} replace />;
}
