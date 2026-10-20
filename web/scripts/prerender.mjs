// Runs after the two Vite builds. Turns the app into real HTML for every public page, so search
// engines and link previews read the content without running JavaScript, and writes robots.txt,
// sitemap.xml and the web manifest. The build fails if a page comes out wrong.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dist = resolve("dist");
const fail = (message) => {
  console.error(`prerender: ${message}`);
  process.exit(1);
};
const count = (text, pattern) => (text.match(pattern) ?? []).length;
const escapeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const ssr = await import(pathToFileURL(resolve("dist-ssr/entry-server.js")).href);
const { PAGES, PUBLIC_PATHS, JSON_LD, absolute, render, robotsTxt, sitemapXml, manifestJson } = ssr;

const shell = await readFile(`${dist}/index.html`, "utf8");
if (shell.includes("data-path=")) fail("dist/index.html is already pre-rendered. Run a fresh build.");
for (const part of ['<div id="root"></div>', "<!--seo--><!--/seo-->", "<!--preload-->"]) {
  if (!shell.includes(part)) fail(`dist/index.html lost "${part}". Check index.html and the Vite output.`);
}

// Start fetching the two fonts the first screen needs before the stylesheet has been read.
const assets = await readdir(`${dist}/assets`);
const preloads = ["archivo-black-latin-400-normal", "archivo-latin-400-normal"]
  .map((name) => assets.find((file) => file.startsWith(`${name}-`) && file.endsWith(".woff2")))
  .filter(Boolean)
  .map((file) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${file}" />`)
  .join("");

for (const path of PUBLIC_PATHS) {
  const { head, body } = await render(path);
  const page = PAGES[path];
  const ld = JSON_LD[path]?.();
  const seo =
    "<!--seo-->" +
    head +
    (ld ? `<script type="application/ld+json">${escapeJson(ld)}</script>` : "") +
    "<!--/seo-->";
  const html = shell
    .replace("<!--preload-->", preloads)
    .replace("<!--seo--><!--/seo-->", () => seo)
    .replace('<div id="root"></div>', () => `<div id="root" data-path="${path}">${body}</div>`);

  const problems = [];
  if (count(html, /<title>/g) !== 1) problems.push("needs exactly one <title>");
  if (!html.includes(`<title>${page.title}</title>`)) problems.push("title does not match pages.js");
  if (count(html, /<meta name="description"/g) !== 1) problems.push("needs exactly one description");
  if (count(html, /<link rel="canonical"/g) !== 1) problems.push("needs exactly one canonical link");
  if (!html.includes(`<link rel="canonical" href="${absolute(path)}"/>`)) problems.push("wrong canonical URL");
  if (!html.includes('<meta name="robots" content="index,follow"/>')) problems.push("not marked indexable");
  if (!html.includes('<meta property="og:image" content="')) problems.push("no share image");
  if (count(html, /<h1[\s>]/g) !== 1) problems.push("needs exactly one <h1>");
  if (body.replace(/<[^>]*>/g, "").trim().length < 120) problems.push("almost no text in the page body");
  if (/undefined|\[object /.test(head)) problems.push("head contains undefined");
  if (problems.length) fail(`${path}: ${problems.join("; ")}`);

  // "/" replaces the empty shell: Cloudflare serves index.html for the home page. Other pages get
  // their own file, which Cloudflare serves without the .html.
  const file = path === "/" ? "index.html" : `${path.slice(1)}.html`;
  await writeFile(`${dist}/${file}`, html);
  console.log(`prerender: ${path.padEnd(9)} -> ${file}  (${Math.round(html.length / 1024)} KB)`);
}

// When a Content-Security-Policy is added, the one inline script in index.html needs this hash in script-src.
const inline = shell.match(/<script>([\s\S]*?)<\/script>/);
if (inline) console.log(`prerender: CSP hash for the inline script: 'sha256-${createHash("sha256").update(inline[1]).digest("base64")}'`);

await writeFile(`${dist}/robots.txt`, robotsTxt());
await writeFile(`${dist}/sitemap.xml`, sitemapXml());
await writeFile(`${dist}/site.webmanifest`, manifestJson());
console.log("prerender: robots.txt, sitemap.xml, site.webmanifest written");
