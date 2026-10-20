import { Link } from "react-router";
import { LEGAL_LINKS } from "./legal.js";
import s from "./SiteFooter.module.css";

// Privacy, Terms and Contact, side by side.
export default function LegalLinks({ className = "" }) {
  return (
    <nav className={`${s.links} ${className}`} aria-label="Legal">
      {LEGAL_LINKS.map((link) => (
        <Link key={link.to} to={link.to}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
