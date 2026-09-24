import { Routes, Route } from "react-router";
import LandingPage from "@/features/landing/LandingPage.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";
import SignupPage from "@/features/auth/SignupPage.jsx";
import NotFound from "./NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
