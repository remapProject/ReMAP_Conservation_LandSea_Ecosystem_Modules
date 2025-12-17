import { Router } from "express";
import multer from "multer";
import {
  fullIntersection,
  webhookIntersection,
} from "../controllers/Intersection.controller";

const storage = multer.memoryStorage();
const upload = multer({ storage });
const intersectionRouter = Router();

intersectionRouter.post(
  "/offline",
  upload.fields([{ name: "layer1" }, { name: "layer2" }]),
  fullIntersection
);

intersectionRouter.get("/webhook", webhookIntersection);

export default intersectionRouter;
