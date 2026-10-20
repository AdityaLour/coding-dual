import { LegalPage } from "./LegalPage.jsx";
import { TERMS } from "./content.js";

export default function TermsPage() {
  return <LegalPage doc={TERMS} path="/terms" />;
}
