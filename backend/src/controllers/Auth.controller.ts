import { JWT_SECRET } from "../config";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const adminLogin = (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (username == username && password === password) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ success: true, token });
    return;
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
};

export const checkAuth = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Valid token" });
};
