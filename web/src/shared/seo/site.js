// The one place that knows the public address. Change it here (or set VITE_SITE_URL at build time)
// and every canonical link, share tag, sitemap entry and robots rule follows.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL ?? "https://playboip.online").replace(/\/+$/, "");
export const SITE_NAME = "Boip";
export const SOCIAL_IMAGE = { path: "/og-image.png", width: 1200, height: 630, alt: "Boip: same problem, two players, one clock." };

export const absolute = (path) => `${SITE_URL}${path === "/" ? "/" : path}`;
