import { Link } from "react-router";
import Logo from "@/shared/ui/Logo.jsx";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <title>Page not found — Boip</title>
      <Logo />
      <h1 className={styles.title}>This page doesn't exist.</h1>
      <Link to="/" className="btn btn-secondary">
        Go to the home page
      </Link>
    </main>
  );
}
