import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subcription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  //TODO: toggle subscription
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  //TODO: controller to return subscriber list of a channel
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  //TODO: controller to return channel list to which user has subscribed
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
