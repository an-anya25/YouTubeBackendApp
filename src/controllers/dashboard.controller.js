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
          owner: new mongoose.Types.ObjectId(`${req.user?._id}`), //  filters videos for the current userID.
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
      }, // join the owner local field with the users model. here the owner local field is a ObjectId, so this is utilised to join with the other model, this results are stored as owner. here we use project in a nested pipeline to get the required field from the users model. so the owner will have these fields.
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      }, // new fields are added to the video model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
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
    ]); // project so that the output from the aggregate method has a speicfied format. the id, thumbnail, title, description are sent from the videos model. username, fullName, avatar are inside the owner field, so it is projected accordingly

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
            owner: new mongoose.Types.ObjectId(`${channelId}`), // filters videos for a specific channel.
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
        },// join the owner local field with the users model. here the owner local field is a ObjectId, so this is utilised to join with the other model, this results are stored as owner. here we use project in a nested pipeline to get the required field from the users model. so the owner will have these fields.
        {
          $addFields: {
            owner: {
              $first: "$owner",
            },
          },
        }, // new fields are added to the video model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
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
        }, // project so that the output from the aggregate method has a speicfied format. the id, thumbnail, title, description are sent from the videos model. username, fullName, avatar are inside the owner field, so it is projected accordingly
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
