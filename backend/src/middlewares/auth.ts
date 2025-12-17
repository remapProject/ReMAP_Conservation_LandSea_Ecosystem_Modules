import { JWT_SECRET } from "../config";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    res.status(401).redirect('/admin/login');
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if ((decoded as JwtPayload).role === "admin") {
      next();
    }
  } catch (err) {
    res.status(401).send({ error: "Invalid or expired token" });
  }
};
