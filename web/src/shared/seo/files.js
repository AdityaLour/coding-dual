import { PUBLIC_PATHS } from "./pages.js";
import { SITE_URL, absolute } from "./site.js";

// App and account routes: signed-in screens and one-time email links. Nothing here is for a search result.
export const PRIVATE_PATHS = [
  "/home",
  "/duel",
  "/practice",
  "/daily",
  "/leaderboard",
  "/profile",
  "/welcome",
  "/verify-email",
  "/reset-password",
  "/confirm-email",
];

// Crawlers that collect pages to train AI models. Search engines are allowed; these are asked to stay out.
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "Diffbot",
];

export function robotsTxt() {
  const lines = ["User-agent: *", "Allow: /", ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), ""];
  lines.push("# AI training crawlers are not welcome.");
  for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`, "Disallow: /", "");
  lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`, "");
  return lines.join("\n");
}

export function sitemapXml() {
  const urls = PUBLIC_PATHS.map((p) => `  <url><loc>${absolute(p)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function manifestJson() {
  return JSON.stringify(
    {
      name: "Boip",
      short_name: "Boip",
      description: "Live 1v1 coding duels.",
      start_url: "/",
      display: "browser",
      background_color: "#101214",
      theme_color: "#101214",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  );
}
