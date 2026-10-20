import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import LandingPage from "@/features/landing/LandingPage.jsx";
import AuthLayout from "@/features/auth/AuthLayout.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";
import SignupPage from "@/features/auth/SignupPage.jsx";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "@/features/auth/VerifyEmailPage.jsx";
import ConfirmEmailPage from "@/features/auth/ConfirmEmailPage.jsx";
import WelcomePage from "@/features/auth/WelcomePage.jsx";
import { GuestOnly, RequireAuth } from "@/shared/auth/RouteGuards.jsx";
import PageLoader from "@/shared/ui/PageLoader.jsx";
import ErrorBoundary from "@/shared/ui/ErrorBoundary.jsx";
import RealtimeProvider from "@/shared/realtime/RealtimeProvider.jsx";
import DuelProvider from "@/features/duel/DuelProvider.jsx";
import NotFound from "./NotFound.jsx";

// Loaded only when someone opens it: logged-out visitors never download it.
const HomePage = lazy(() => import("@/features/home/HomePage.jsx"));
const DuelPage = lazy(() => import("@/features/duel/DuelPage.jsx"));
const PracticePage = lazy(() => import("@/features/practice/PracticePage.jsx"));
const SolvePage = lazy(() => import("@/features/practice/SolvePage.jsx"));
const DailyPage = lazy(() => import("@/features/daily/DailyPage.jsx"));
const LeaderboardPage = lazy(() => import("@/features/leaderboard/LeaderboardPage.jsx"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage.jsx"));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Logged-in people are sent on to /home (or to pick a username). */}
          <Route element={<GuestOnly />}>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
          </Route>

          {/* Email links work whether or not someone is logged in. */}
          <Route element={<AuthLayout />}>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route element={<RequireAuth allowMissingUsername />}>
              <Route path="/welcome" element={<WelcomePage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<RealtimeProvider />}>
              <Route element={<DuelProvider />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/duel" element={<DuelPage />} />
              </Route>{" "}
            </Route>{" "}
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice/:slug" element={<SolvePage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:tab" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
