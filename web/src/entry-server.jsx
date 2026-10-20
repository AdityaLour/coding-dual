// Build-time only: renders a public page to static HTML. Never shipped to browsers.
/* oxlint-disable react/only-export-components -- not a hot-reloaded module */
import { StaticRouter } from "react-router";
import { prerender } from "react-dom/static";
import AuthProvider from "@/shared/auth/AuthProvider.jsx";
import App from "@/app/App.jsx";

export { PAGES, PUBLIC_PATHS } from "@/shared/seo/pages.js";
export { SITE_URL, absolute } from "@/shared/seo/site.js";
export { JSON_LD } from "@/shared/seo/jsonld.js";
export { robotsTxt, sitemapXml, manifestJson } from "@/shared/seo/files.js";

// React puts <title>, <meta> and <link> at the very start of its output; peel them off for <head>.
const HEAD_TAG = /^(?:<title>[\s\S]*?<\/title>|<meta [^>]*\/>|<link [^>]*\/>)/;

export async function render(path) {
  const { prelude } = await prerender(
    <StaticRouter location={path}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StaticRouter>,
  );
  let body = await new Response(prelude).text();
  let head = "";
  for (let m = HEAD_TAG.exec(body); m; m = HEAD_TAG.exec(body)) {
    head += m[0];
    body = body.slice(m[0].length);
  }
  return { head, body };
}
