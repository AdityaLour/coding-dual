// Words that change between the two auth pages.
export const AUTH_COPY = {
  login: {
    heading: "Welcome back.",
    blurb: "Log in to find a rival and start a duel.",
    banner: "Welcome back",
  },
  signup: {
    heading: "Pick a side.",
    blurb: "Create an account and get matched with your first rival.",
    banner: "Here comes a new challenger",
  },
};

export const AUTH_PATHS = { login: "/login", signup: "/signup" };

export function modeFromPath(pathname) {
  return pathname === AUTH_PATHS.signup ? "signup" : "login";
}
