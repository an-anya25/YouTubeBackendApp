import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTweet,
  deleteTweet,
  getCurrentUserTweets,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getCurrentUserTweets).post(createTweet);

router.route("/user/:userId").get(getUserTweets);

router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;
