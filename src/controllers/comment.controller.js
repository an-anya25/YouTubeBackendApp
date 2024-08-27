import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);
  if (isValidObjectId(videoId)) {
    // const totalComments = await Comment.countDocuments({ video: videoId });

    const comments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(`${videoId}`), // filters comments for a specific videoId.
        },
      },
      {
        $sort: {
          createdAt: -1, // descending order wrt createdAt
        },
      },
      {
        $skip: (page - 1) * limit, // skip the comments while viewing, for pagination
      },
      {
        $limit: limit, // limit the comments being displayed
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video",
          pipeline: [
            {
              $project: {
                title: 1,
                description: 1,
                views: 1,
                thumbnail: 1,
              },
            },
          ],
        },
      }, // join the video local field with the videos model. here the video local field is a ObjectId, so this is utilised to join with the other model, this results are stored as video. here we use project in a nested pipeline to get the required field from the videos model. so the video will have these fields.
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
          video: {
            $first: "$video",
          },
          owner: {
            $first: "$owner",
          },
        },
      }, // new fields are added to the comment model, these fields are videos and owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
      {
        $project: {
          _id: 1,
          content: 1,
          username: "$owner.username",
          fullName: "$owner.fullName",
          avatar: "$owner.avatar",
          videoTitle: "$video.title",
          videoDescription: "$video.description",
          views: "$video.views",
          thumbnail: "$video.thumbnail",
        },
      }, // project so that the output from the aggregate method has a speicfied format. the id and content are sent from the comments model. username, fullName, avatar are inside the owner field, and videoTitle, videoDescription, views, thumbnail are inside the video field, so it is projected accordingly
    ]);

    if (comments.length === 0 && page != 1) {
      throw new ApiError(404, "Comments exhausted");
    }
    if (comments.length === 0 && page === 1) {
      throw new ApiError(404, "No comments found for this video");
    }

    // for getting pagination data like total comments, currentPage, totalPages, limit

    // const totalPages = Math.ceil(totalComments / limit);

    // const data = {
    //   comments,
    //   pagination: {
    //   totalComments,
    //   currentPage: page,
    //   totalPages,
    //   limit,
    //   },
    // };

    res
      .status(200)
      .json(new ApiResponse(200, comments, "Comments fetched successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

// add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (isValidObjectId(videoId)) {
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    const owner = req.user?._id;

    const comment = await Comment.create({
      content,
      video: videoId,
      owner,
    });

    if (!comment) {
      throw new ApiError(500, "Something went wrong while adding the comment");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, comment, "Comment saved successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

// update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (isValidObjectId(commentId)) {
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $set: {
          content,
        },
      },
      {
        new: true,
      }
    );

    if (!updateComment) {
      throw new ApiError(404, "Comment not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
      );
  } else {
    throw new ApiError(404, "Comment does not exist");
  }
});

// delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isValidObjectId(commentId)) {
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      throw new ApiError(404, "Comment not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment deleted successfully"));
  } else {
    throw new ApiError(404, "Comment does not exist");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
