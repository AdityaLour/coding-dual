import { Component } from "react";
import Logo from "./Logo.jsx";
import s from "./ErrorBoundary.module.css";

// Catches crashes and failed page downloads, and shows a way out instead of a
// blank screen or an endless loader. (Error boundaries must be class components.)
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Page error:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={s.page}>
        <title>Something went wrong — Boip</title>
        <Logo />
        <div className={s.body}>
          <h1 className={s.title}>Something went wrong.</h1>
          <p className={s.text}>
            This page didn&apos;t load properly. Reloading usually fixes it.
          </p>
          <div className={s.actions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            <a href="/" className="btn btn-secondary">
              Go to the home page
            </a>
          </div>
        </div>
      </main>
    );
  }
}
