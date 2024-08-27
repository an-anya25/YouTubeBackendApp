import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// create tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const owner = req.user?._id;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.create({
    owner,
    content,
  });

  if (!tweet) {
    throw new ApiError(400, "Something went wrong while adding the tweet");
  }

  res
    .status(201)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

// get all current user tweets
const getCurrentUserTweets = asyncHandler(async (req, res) => {
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: req.user?._id, // filters tweet for the currently logged in user
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
    }, // new fields are added to the tweet model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
    {
      $project: {
        _id: 1,
        content: 1,
        username: "$owner.username",
        fullName: "$owner.fullName",
        avatar: "$owner.avatar",
      },
    }, // project so that the output from the aggregate method has a speicfied format. the id and content are sent from the tweets model. username, fullName, avatar are inside the owner field, so it is projected accordingly
  ]);

  if (tweets.length === 0) {
    res
      .status(200)
      .json(new ApiResponse(200, {}, "User does not have any tweets"));
  } else {
    res
      .status(200)
      .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
  }
});

// get all user tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(`${userId}`), // filters tweet for a specific userId.
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
    }, // new fields are added to the tweet model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
    {
      $project: {
        _id: 1,
        content: 1,
        username: "$owner.username",
        fullName: "$owner.fullName",
        avatar: "$owner.avatar",
      },
    }, // project so that the output from the aggregate method has a speicfied format. the id, content are taken from the tweets model. username, fullName, avatar are inside the owner field, so it is projected accordingly
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
});

// update tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet does not exist");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

// delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deletedTweet) {
    throw new ApiError(404, "Tweet does not exist");
  }

  res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export {
  createTweet,
  getCurrentUserTweets,
  getUserTweets,
  updateTweet,
  deleteTweet,
};
