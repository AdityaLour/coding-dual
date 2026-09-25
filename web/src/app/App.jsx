import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import LandingPage from "@/features/landing/LandingPage.jsx";
import AuthLayout from "@/features/auth/AuthLayout.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";
import SignupPage from "@/features/auth/SignupPage.jsx";
import ComingSoon from "@/shared/ui/ComingSoon.jsx";
import PageLoader from "@/shared/ui/PageLoader.jsx";
import ErrorBoundary from "@/shared/ui/ErrorBoundary.jsx";
import NotFound from "./NotFound.jsx";

// Loaded only when someone opens it: logged-out visitors never download it.
const HomePage = lazy(() => import("@/features/home/HomePage.jsx"));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/practice"
            element={
              <ComingSoon title="Practice">
                Solo practice is coming soon.
              </ComingSoon>
            }
          />
          <Route
            path="/daily"
            element={
              <ComingSoon title="Daily challenge">
                One problem for everyone, every day. Coming soon.
              </ComingSoon>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ComingSoon title="Leaderboard">
                Ratings and the leaderboard arrive once rated duels are live.
              </ComingSoon>
            }
          />
          <Route
            path="/profile"
            element={
              <ComingSoon title="Profile">
                Your profile page is coming soon.
              </ComingSoon>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
