import express from "express";
import { signup, login, checkSession } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/session", checkSession);

export default router;
