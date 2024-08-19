import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const likedBy = req.user?._id;

  try {
    let like;
    like = await Like.findOne({
      video: videoId,
      likedBy,
    });

    //create a like document if there is no like
    if (!like) {
      like = await Like.create({
        video: videoId,
        likedBy,
      });
    } else {
      // remove the like document
      await Like.deleteOne({
        video: videoId,
        likedBy,
      });
      like = {};
    }

    res
      .status(200)
      .json(new ApiResponse(200, like, "Like toggled on video successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong while toggling"
    );
  }
});

// toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const likedBy = req.user?._id;

  try {
    let like;
    like = await Like.findOne({
      comment: commentId,
      likedBy,
    });

    if (!like) {
      like = await Like.create({
        comment: commentId,
        likedBy,
      });
    } else {
      await Like.deleteOne({
        comment: commentId,
        likedBy,
      });
      like = {};
    }

    res
      .status(200)
      .json(new ApiResponse(200, like, "Like toggled on comment successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while toggling");
  }
});

// toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const likedBy = req.user?._id;
  try {
    let like;
    like = await Like.findOne({
      tweet: tweetId,
      likedBy,
    });

    if (!like) {
      like=await Like.create({
        tweet: tweetId,
        likedBy,
      });
    } else {
      await Like.deleteOne({
        tweet: tweetId,
        likedBy,
      });
      like={}
    }

    res
      .status(200)
      .json(new ApiResponse(200, like, "Like toggled on tweet successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while toggling");
  }
});

// get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(`${req.user?._id}`),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
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
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    { $unwind: "$likedVideos" },
    {
      $project: {
        _id: "$likedVideos._id",
        thumbnail: "$likedVideos.thumbnail",
        title: "$likedVideos.title",
        description: "$likedVideos.description",
        views: "$likedVideos.views",
        fullName: "$likedVideos.owner.fullName",
        username: "$likedVideos.owner.username",
        avatar: "$likedVideos.owner.avatar",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos,
        "All videos liked by the user fetched successfully"
      )
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
