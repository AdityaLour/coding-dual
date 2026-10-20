// Where to write to us. One place, so it changes in one place.
// TODO before launch: replace this placeholder with the real address.
export const CONTACT_EMAIL = "contact@playboip.online";

export const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/contact", label: "Contact" },
];

export const copyright = (now = new Date()) => `© ${now.getFullYear()} Boip`;
