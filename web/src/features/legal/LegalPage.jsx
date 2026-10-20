import { Link } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import SiteFooter from "@/shared/ui/SiteFooter.jsx";
import Seo from "@/shared/seo/Seo.jsx";
import { CONTACT_EMAIL } from "@/shared/ui/legal.js";
import { CONTACT, UPDATED, splitContact } from "./content.js";
import s from "./Legal.module.css";

function Text({ children }) {
  return splitContact(children).map((part, i) =>
    part === "{contact}" ? (
      <Link key={i} to="/contact">
        contact page
      </Link>
    ) : (
      part
    ),
  );
}

function Shell({ path, children }) {
  return (
    <div className={s.page}>
      <Seo path={path} />
      <div className={s.head}>
        <Logo />
      </div>
      <main className={s.main}>{children}</main>
      <SiteFooter variant="compact" />
    </div>
  );
}

// Privacy and Terms: a title, a date, and sections of plain text.
export function LegalPage({ doc, path }) {
  return (
    <Shell path={path}>
      <h1 className={s.title}>{doc.title}</h1>
      <p className={s.lead}>{doc.lead}</p>
      <p className={s.updated}>Last updated {UPDATED}</p>
      <div className={s.doc}>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((item, i) =>
              typeof item === "string" ? (
                <p key={i}>
                  <Text>{item}</Text>
                </p>
              ) : (
                <ul key={i}>
                  {item.list.map((line) => (
                    <li key={line}>
                      <Text>{line}</Text>
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell path="/contact">
      <h1 className={s.title}>{CONTACT.title}</h1>
      <p className={s.lead}>{CONTACT.lead}</p>
      <div className={s.contact}>
        <a className={s.mail} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        <p>For a request about your data or account, write from the email address on your account. We read everything and reply as soon as we can.</p>
      </div>
    </Shell>
  );
}
