import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/channel/:channelId")
  .get(getUserChannelSubscribers)
  .patch(toggleSubscription);

router.route("/user/:subscriberId").get(getSubscribedChannels);

export default router;
