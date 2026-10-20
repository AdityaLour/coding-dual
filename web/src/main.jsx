import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource/archivo/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@/shared/styles/tokens.css";
import "@/shared/styles/global.css";
import AuthProvider from "@/shared/auth/AuthProvider.jsx";
import App from "@/app/App.jsx";

const root = document.getElementById("root");
const app = (
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// A public page arrives pre-rendered (see scripts/prerender.mjs): attach to it instead of rebuilding it.
// The inline script in index.html empties the root when the address is not the page's own.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
