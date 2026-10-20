import test from "node:test";
import assert from "node:assert/strict";
import { PAGES, PUBLIC_PATHS } from "./pages.js";
import { AI_CRAWLERS, PRIVATE_PATHS, manifestJson, robotsTxt, sitemapXml } from "./files.js";
import { landingJsonLd } from "./jsonld.js";
import { SITE_URL, absolute } from "./site.js";

test("every public page has a title that fits a search result and a useful description", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const path of PUBLIC_PATHS) {
    const { title, description } = PAGES[path];
    assert.ok(title.length >= 10 && title.length <= 60, `${path} title is ${title.length} characters`);
    assert.ok(description.length >= 70 && description.length <= 160, `${path} description is ${description.length} characters`);
    assert.ok(!titles.has(title), `${path} repeats another page's title`);
    assert.ok(!descriptions.has(description), `${path} repeats another page's description`);
    titles.add(title);
    descriptions.add(description);
  }
});

test("only real, root-relative paths are listed, and none of them is a private route", () => {
  for (const path of PUBLIC_PATHS) {
    assert.ok(path.startsWith("/") && (path === "/" || !path.endsWith("/")), `${path} must start with / and not end with /`);
    assert.ok(!PRIVATE_PATHS.includes(path), `${path} is both public and private`);
  }
  assert.ok(PUBLIC_PATHS.includes("/"));
});

test("addresses are absolute, use the one site URL and have no trailing slash except the home page", () => {
  assert.match(SITE_URL, /^https:\/\/[^/]+$/);
  assert.equal(absolute("/"), `${SITE_URL}/`);
  assert.equal(absolute("/privacy"), `${SITE_URL}/privacy`);
});

test("robots.txt welcomes search engines, keeps the app out, turns AI training crawlers away and names the sitemap", () => {
  const text = robotsTxt();
  const everyone = text.split("\n\n")[0];
  assert.match(everyone, /User-agent: \*\nAllow: \//);
  assert.doesNotMatch(everyone, /^Disallow: \/$/m);
  for (const path of PRIVATE_PATHS) assert.match(everyone, new RegExp(`^Disallow: ${path}$`, "m"));
  for (const bot of AI_CRAWLERS) assert.match(text, new RegExp(`User-agent: ${bot}\\nDisallow: /\\n`));
  for (const bot of ["Googlebot", "Bingbot"]) assert.doesNotMatch(text, new RegExp(bot));
  assert.match(text, new RegExp(`Sitemap: ${SITE_URL}/sitemap.xml`));
});

test("the sitemap lists exactly the public pages", () => {
  const xml = sitemapXml();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, PUBLIC_PATHS.map(absolute));
});

test("the structured data points at the site and only states what the pages say", () => {
  const data = landingJsonLd();
  const text = JSON.stringify(data);
  assert.doesNotThrow(() => JSON.parse(text));
  assert.equal(data["@context"], "https://schema.org");
  for (const item of data["@graph"]) assert.ok(item["@type"]);
  assert.doesNotMatch(text, /aggregateRating|"offers"|"price"/);
});

test("the manifest names the app and its icons", () => {
  const manifest = JSON.parse(manifestJson());
  assert.equal(manifest.name, "Boip");
  assert.ok(manifest.icons.length >= 2);
});
