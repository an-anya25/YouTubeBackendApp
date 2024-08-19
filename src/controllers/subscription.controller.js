import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subcription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (isValidObjectId(channelId)) {
    const subscription = await Subscription.findOne({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!subscription) {
      const createdSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
      });

      if (!createdSubscription) {
        throw new ApiError(
          500,
          "Something went wrong while adding the subscription"
        );
      }
      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            createdSubscription,
            "Subscribed to channel successfully"
          )
        );
    } else {
      const deletedSubscription = await Subscription.deleteOne({
        subscriber: req.user?._id,
        channel: channelId,
      });

      if (!deletedSubscription) {
        throw new ApiError(
          500,
          "Something went wrong while removing the subscription"
        );
      }

      res
        .status(200)
        .json(new ApiResponse(200, {}, "Subscription removed successfully"));
    }
  } else {
    throw new ApiError(404, "Channel does not exist");
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(`${req.user?._id}`),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribers",
    },
    {
      $project: {
        _id: "$subscribers._id",
        fullName: "$subscribers.fullName",
        username: "$subscribers.username",
        avatar: "$subscribers.avatar",
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "All subscribers of the channel fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(`${req.user?._id}`),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannels",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedChannels",
    },
    {
      $project: {
        _id: "$subscribedChannels._id",
        fullName: "$subscribedChannels.fullName",
        username: "$subscribedChannels.username",
        avatar: "$subscribedChannels.avatar",
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Fetched all user channel subscription"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
