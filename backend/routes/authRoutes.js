import express from "express";
import {
  checkSession,
  forgotPassword,
  googleAuth,
  login,
  logout,
  resendVerification,
  resetPassword,
  setUsername,
  signup,
  verifyEmail,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSameOrigin } from "../middleware/requireSameOrigin.js";
import {
  authLimit,
  emailAddressLimit,
  emailIpLimit,
  googleLimit,
  linkLimit,
  loginEmailLimit,
  loginIpLimit,
  signupLimit,
  usernameLimit,
} from "../middleware/rateLimits.js";

const router = express.Router();

router.use(requireSameOrigin, authLimit);

router.post("/signup", signupLimit, signup);
router.post("/verify-email", linkLimit, verifyEmail);
router.post(
  "/resend-verification",
  emailIpLimit,
  emailAddressLimit,
  resendVerification,
);
router.post("/login", loginIpLimit, loginEmailLimit, login);
router.post("/google", googleLimit, googleAuth);
router.post("/username", usernameLimit, requireAuth, setUsername);
router.get("/session", requireAuth, checkSession);
router.post("/logout", logout);
router.post(
  "/forgot-password",
  emailIpLimit,
  emailAddressLimit,
  forgotPassword,
);
router.post("/reset-password", linkLimit, resetPassword);

export default router;
