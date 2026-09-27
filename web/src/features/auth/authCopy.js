// Words that change between the auth pages (brand panel + page-switch banner).
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
  forgot: {
    heading: "Locked out?",
    blurb: "We'll email you a link to choose a new password.",
  },
  reset: {
    heading: "Fresh start.",
    blurb: "Choose a new password. Every other device gets logged out.",
  },
  verify: {
    heading: "One last step.",
    blurb: "Confirming your email keeps your account yours.",
  },
  welcome: {
    heading: "Pick a name.",
    blurb: "Your rivals will see it in every duel.",
  },
};

export const AUTH_PATHS = {
  login: "/login",
  signup: "/signup",
  forgot: "/forgot-password",
  reset: "/reset-password",
  verify: "/verify-email",
  welcome: "/welcome",
};

export function modeFromPath(pathname) {
  return (
    Object.keys(AUTH_PATHS).find((mode) => AUTH_PATHS[mode] === pathname) ??
    "login"
  );
}

// Email links carry their token after "#", which never reaches a server or its logs.
export function tokenFromHash(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
