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
      like = await Like.create({
        tweet: tweetId,
        likedBy,
      });
    } else {
      await Like.deleteOne({
        tweet: tweetId,
        likedBy,
      });
      like = {};
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
        likedBy: new mongoose.Types.ObjectId(`${req.user?._id}`), // filters likes for current userID.
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
          }, // join and project the user on the videos model using the objectId of the owner
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          }, // add/replace the owner field into the likedVideos
        ],
      },
    }, // here a nested pipeline is used. so the first lookup is done to join the local field videos with the video model. but the video model has a field user which is a ObjectId and can be joined further. so a nested lookup is created to join the videos model with the users model. here project is used to get the required fields in the user in the videos model. and this is then added as a new field/ replacement in the videos model as owner. and here we get this result and other video fields as likedVideos
    {
      $unwind: "$likedVideos",
    }, // unwind is applied here, because likedVideos is a list containing the details of the liked videos, so to access each video individually and for the ease of projecting unwind is applied
    {
      $project: {
        _id: "$likedVideos._id", // id of the videos in the likedVideos are taken for id to be unique.
        thumbnail: "$likedVideos.thumbnail",
        title: "$likedVideos.title",
        description: "$likedVideos.description",
        views: "$likedVideos.views",
        fullName: "$likedVideos.owner.fullName",
        username: "$likedVideos.owner.username",
        avatar: "$likedVideos.owner.avatar",
      },
    }, // here, each uniquely liked videos has its unique videoId. since this is a list that is being returned adding field is not suitable, hence unwind. the thumbnail, title, description are taken from the likedVideos field, which is an array of videos model items, the fullName, username, avatar is inside the owner field in the likedVideos, so it is projected likedwise.
  ]);

  //before unwind, each document in the collection may have an array field (e.g., likedVideos) that contains multiple documents. $unwind deconstructs the likedVideos array. Each element of the array becomes its own document. This means you will have a separate document for each video in the likedVideos array.

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
