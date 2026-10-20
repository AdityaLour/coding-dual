import { LegalPage } from "./LegalPage.jsx";
import { PRIVACY } from "./content.js";

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} path="/privacy" />;
}
