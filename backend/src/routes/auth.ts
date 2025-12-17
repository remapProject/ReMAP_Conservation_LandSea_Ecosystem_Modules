import { authenticateAdmin } from "../middlewares/auth";
import { adminLogin, checkAuth } from "../controllers/Auth.controller";
import express from "express";

const authRouter = express.Router();

authRouter.post("/admin/login", adminLogin);
authRouter.get("/admin/check", authenticateAdmin, checkAuth);

export default authRouter;
