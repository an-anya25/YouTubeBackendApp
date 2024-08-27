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
        channel: new mongoose.Types.ObjectId(`${req.user?._id}`), // filters subscriber, so matching is done with the channel. all users with the required channel field in the documents of the subscription model are the subscribers of that channel
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
    }, // join the subscriber local field with the users model. here the subscriber local field is a ObjectId, so this is utilised to join with the other model, this results are stored as subscribers. here we use project in a nested pipeline to get the required field from the users model. so the owner will have these fields.
    {
      $unwind: "$subscribers",
    }, // unwind is applied here, because subscribers is a list containing the details of the subscribed users, so to access each subscriber individually and for the ease of projecting unwind is applied
    {
      $project: {
        _id: "$subscribers._id",
        fullName: "$subscribers.fullName",
        username: "$subscribers.username",
        avatar: "$subscribers.avatar",
      },
    }, //  here, each subscriber has its unique userId. since this is a list that is being returned adding field is not suitable, hence unwind. the fullName, username, avatar is inside the subscribers array so it is projected likedwise.
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
        subscriber: new mongoose.Types.ObjectId(`${req.user?._id}`), // filters channel, so matching is done with the subscribing user. all channels with the required subscriber field ie the userId of the user who is cuurently logged in, in the documents of the subscription model are the channels to which the user has subscribed to
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
    }, // join the channel local field with the users model. here the channel local field is a ObjectId, so this is utilised to join with the other model, this results are stored as subscribedChannels. here we use project in a nested pipeline to get the required field from the users model. so the subscribedChannels will have these fields.
    {
      $unwind: "$subscribedChannels",
    },// unwind is applied here, because subscribedChannels is a list containing the details of the channels to which the user has subscribed to, so to access each video individually and for the ease of projecting unwind is applied
    {
      $project: {
        _id: "$subscribedChannels._id",
        fullName: "$subscribedChannels.fullName",
        username: "$subscribedChannels.username",
        avatar: "$subscribedChannels.avatar",
      },
    }, //  here, each channel has its unique userId. since this is a list that is being returned adding field is not suitable, hence unwind. the fullName, username, avatar is inside the subscribedChannels array so it is projected likedwise.
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
