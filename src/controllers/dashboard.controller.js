import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subcription.model.js";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//todo get the channel stats like total video views, total subscribers, total videos, total likes etc
const getCurrentUserChannelStats = asyncHandler(async (req, res) => {
  //total videos
  const totalVideosArray = await Video.find({
    owner: req.user?._id,
  });

  const totalVideosCount = totalVideosArray.length;

  //total likes

  let totalVideoLikesCount = 0;
  for (const video of totalVideosArray) {
    totalVideoLikesCount += await Like.countDocuments({
      video: video,
    });
  }

  //total subscribers
  const totalSubscribersCount = await Subscription.countDocuments({
    channel: req.user?._id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideosCount,
        totalVideoLikesCount,
        totalSubscribersCount,
      },
      "All channel stats fetched successfully"
    )
  );
});

// get all the videos uploaded by the current user channel
const getCurrentUserChannelVideos = asyncHandler(async (req, res) => {
  try {
    const videos = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(`${req.user?._id}`),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      },
      {
        $project: {
          _id: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          username: "$owner.username",
          fullname: "$owner.fullName",
          avatar: "$owner.avatar",
          coverImage: "$owner.coverImage",
        },
      },
    ]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          videos,
          "All videos of the channel fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong while getting the channel stats"
    );
  }
});

// get all the videos uploaded by channelId
const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (isValidObjectId(channelId)) {
    try {
      const videos = await Video.aggregate([
        {
          $match: {
            owner: new mongoose.Types.ObjectId(`${channelId}`),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  avatar: 1,
                  coverImage: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            owner: {
              $first: "$owner",
            },
          },
        },
        {
          $project: {
            _id: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            username: "$owner.username",
            fullname: "$owner.fullName",
            avatar: "$owner.avatar",
            coverImage: "$owner.coverImage",
          },
        },
      ]);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            videos,
            "All videos of the channel fetched successfully"
          )
        );
    } catch (error) {
      throw new ApiError(
        500,
        error?.message || "Something went wrong while getting the channel stats"
      );
    }
  } else {
    throw new ApiError(404, "Channel does not exist");
  }
});

export {
  getCurrentUserChannelStats,
  getCurrentUserChannelVideos,
  getChannelVideos,
};
