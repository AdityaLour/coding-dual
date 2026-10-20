import { SITE_NAME, SITE_URL, absolute } from "./site.js";
import { PAGES } from "./pages.js";

// Structured data for the landing page. Only facts that are true and stable: no ratings, prices or counts.
export function landingJsonLd() {
  const org = `${SITE_URL}/#organization`;
  const site = `${SITE_URL}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SITE_NAME,
        url: absolute("/"),
        logo: `${SITE_URL}/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": site,
        url: absolute("/"),
        name: SITE_NAME,
        description: PAGES["/"].description,
        inLanguage: "en",
        publisher: { "@id": org },
      },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: absolute("/"),
        description: PAGES["/"].description,
        applicationCategory: "GameApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        inLanguage: "en",
        isPartOf: { "@id": site },
        publisher: { "@id": org },
      },
    ],
  };
}

export const JSON_LD = { "/": landingJsonLd };
