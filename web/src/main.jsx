import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@/shared/styles/tokens.css";
import "@/shared/styles/global.css";
import AuthProvider from "@/shared/auth/AuthProvider.jsx";
import App from "@/app/App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
