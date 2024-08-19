import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getChannelVideos,
  getCurrentUserChannelStats,
  getCurrentUserChannelVideos,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/stats").get(getCurrentUserChannelStats);

router.route("/videos").get(getCurrentUserChannelVideos);

router.route("/videos/channel/:channelId").get(getChannelVideos);

export default router;
