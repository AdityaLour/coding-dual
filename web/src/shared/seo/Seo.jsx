import { useEffect } from "react";
import { PAGES } from "./pages.js";
import { SITE_NAME, SOCIAL_IMAGE, SITE_URL, absolute } from "./site.js";

// Title, description, canonical link and share tags for a public page. React puts them in <head>.
// At build time the pre-render step copies them into the static HTML, so crawlers read them without running any code.
export default function Seo({ path }) {
  const page = PAGES[path];
  if (!page) throw new Error(`No SEO entry for ${path}. Add it to shared/seo/pages.js.`);
  const url = absolute(path);
  const image = `${SITE_URL}${SOCIAL_IMAGE.path}`;
  // The inline script in index.html adds a noindex tag on any other address. If the visitor then
  // moves to this page without reloading, it must not sit next to this page's own robots tag.
  useEffect(() => {
    document.querySelectorAll("meta[data-guard]").forEach((tag) => tag.remove());
  }, []);
  return (
    <>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={String(SOCIAL_IMAGE.width)} />
      <meta property="og:image:height" content={String(SOCIAL_IMAGE.height)} />
      <meta property="og:image:alt" content={SOCIAL_IMAGE.alt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={page.title} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={SOCIAL_IMAGE.alt} />
    </>
  );
}
