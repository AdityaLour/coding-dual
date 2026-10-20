// What search engines and link previews should say about each public page.
// Every other route (login, the app, account pages) is left out on purpose: it is not indexed.
// Keep titles under 60 characters and descriptions between 70 and 160, or search results cut them off.
export const PAGES = {
  "/": {
    title: "Boip: live 1v1 coding duels and DSA practice",
    description:
      "Race a rival on the same problem, on the same clock. Live 1v1 coding duels with ratings, plus 150 DSA practice problems and a daily challenge.",
  },
  "/privacy": {
    title: "Privacy | Boip",
    description: "What Boip keeps about you, why, and what you can ask us to do about it.",
  },
  "/terms": {
    title: "Terms | Boip",
    description: "The rules for using Boip, the live 1v1 coding duel platform. By using it, you agree to them.",
  },
  "/contact": {
    title: "Contact | Boip",
    description: "Questions, bugs, feedback, or a request about your data or account. Get in touch with Boip.",
  },
};

export const PUBLIC_PATHS = Object.keys(PAGES);
