import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js";

// get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    title,
    description,
    sortBy,
    sortType,
  } = req.query;
  page = Number(page);
  limit = Number(limit);

  const query = {};

  if (title) {
    query.title = { $regex: title, $options: "i" }; // case insensitive search
  }

  if (description) {
    query.description = { $regex: description, $options: "i" };
  }

  const sortOrder = sortType === "desc" ? -1 : 1;

  const sortOptions = { [sortBy]: sortOrder }; // dynamic property name in js by using []

  const skip = (page - 1) * limit;
  const videos = await Video.aggregate([
    {
      $match: query, // match the query
    },
    {
      $sort: sortOptions, // sort using the sortOptions which is actually sorting the sortBy field using the order given by sortOrder
    },
    {
      $skip: skip, // skip videos for pagination
    },
    {
      $limit: limit, // set limit for pagination
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
    }, // new fields are added to the video model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        thumbnail: 1,
        views: 1,
        fullName: "$owner.fullName",
        username: "$owner.username",
        avatar: "$owner.avatar",
      },
    },// project so that the output from the aggregate method has a speicfied format. the id, thumbnail, title, description are sent from the videos model. username, fullName, avatar are inside the owner field, so it is projected accordingly
  ]);

  if (videos.length === 0 && page != 1) {
    throw new ApiError(404, "Videos exhausted");
  }

  if (videos.length === 0 && page === 1) {
    throw new ApiError(404, "No video found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const owner = req.user?._id;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  let videoLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.video) &&
    req.files.video.length > 0
  ) {
    videoLocalPath = req.files.video[0].path;
  }

  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  let videoFile;
  let thumbnail;
  try {
    videoFile = await uploadOnCloudinary(videoLocalPath);
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  } catch (error) {
    throw new ApiError(500, "Error uploading files to Cloudinary");
  }

  if (!videoFile?.url || !thumbnail?.url) {
    throw new ApiError(
      500,
      "Error uploading to Cloudinary. Cannot retrieve file URLs."
    );
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    videoFilePublicId: videoFile.public_id,
    thumbnail: thumbnail.url,
    thumbnailPublicId: thumbnail.public_id,
    title,
    description,
    owner,
  });

  if (!video) {
    throw new ApiError(500, "Something happened while publishing the video");
  }

  res
    .status(201)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (isValidObjectId(videoId)) {
    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${videoId}`), // filters videos by a speicfic videoId
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
      }, // new fields are added to the video model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          views: 1,
          fullName: "$owner.fullName",
          username: "$owner.username",
          avatar: "$owner.avatar",
        },
      }, // project so that the output from the aggregate method has a speicfied format. the id, thumbnail, title, description are sent from the videos model. username, fullName, avatar are inside the owner field, so it is projected accordingly
    ]);
    res
      .status(200)
      .json(new ApiResponse(200, video[0], "Video fetched successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

// view video by id
const viewVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (isValidObjectId(videoId)) {
    const oldVideo = await Video.findById(videoId);

    if (!oldVideo) {
      throw new ApiError(404, "Video does not exist");
    }

    if (!oldVideo.isPublished) {
      throw new ApiError(400, "Video is not published");
    }

    //update view count
    try {
      oldVideo.views += 1;
      await oldVideo.save();
    } catch (error) {
      throw new ApiError(
        500,
        error.message || "Something went wrong while updating video views count"
      );
    }

    //update user watch history
    const user = req.user;
    try {
      await User.findByIdAndUpdate(user, {
        $addToSet: {
          watchHistory: videoId,
        },
      });
    } catch (error) {
      throw new ApiError(
        500,
        error.message ||
          "Something went wrong while updating user's watch history"
      );
    }

    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${videoId}`), // filters videos by a speicfic videoId
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
      }, // new fields are added to the video model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          views: 1,
          fullName: "$owner.fullName",
          username: "$owner.username",
          avatar: "$owner.avatar",
        },
      }, // project so that the output from the aggregate method has a speicfied format. the id, thumbnail, title, description are sent from the videos model. username, fullName, avatar are inside the owner field, so it is projected accordingly
    ]);
    res
      .status(200)
      .json(new ApiResponse(200, video[0], "Video fetched successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

// update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (isValidObjectId(videoId)) {
    const oldVideo = await Video.findById(videoId);

    if (req.user?._id.toString() !== oldVideo.owner.toString()) {
      throw new ApiError(400, "Unauthorized request");
    }

    const oldThumbnailPublicId = oldVideo.thumbnailPublicId;

    if (!(title || description)) {
      throw new ApiError(400, "All fields are required");
    }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Thumbnail file is missing");
    }

    const deletedFile = await deleteFile(oldThumbnailPublicId, "image");

    if (!deletedFile) {
      throw new ApiError(500, "Could not delete old thumbnail");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
      throw new ApiError(500, "Error while uploading thumbnail to cloudinary");
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          thumbnail: thumbnail.url,
          thumbnailPublicId: thumbnail.public_id,
          title,
          description,
        },
      },
      {
        new: true,
      }
    );

    res
      .status(200)
      .json(new ApiResponse(200, video, "Video updated successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

/// delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (isValidObjectId(videoId)) {
    const oldVideo = await Video.findById(videoId);

    if (req.user?._id.toString() !== oldVideo.owner.toString()) {
      throw new ApiError(400, "Unauthorized request");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    const oldVideoFile = deletedVideo.videoFilePublicId;
    const oldThumbnail = deletedVideo.thumbnailPublicId;

    const deletedVideoFile = await deleteFile(oldVideoFile, "video");
    const deletedThumbnail = await deleteFile(oldThumbnail, "image");

    if (!deletedVideoFile) {
      throw new ApiError(
        500,
        "Something went wrong while deleting video from cloudinary"
      );
    }
    if (!deletedThumbnail) {
      throw new ApiError(
        500,
        "Something went wrong while deleting thumbnail from cloudinary"
      );
    }

    if (!deleteVideo) {
      throw new ApiError(404, "Video does not exist");
    }

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted successfully"));
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

// toggle the publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (isValidObjectId(videoId)) {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video does not exist");
    }

    if (req.user?._id.toString() !== video.owner.toString()) {
      throw new ApiError(400, "Unauthorized request");
    }

    const isPublished = !video.isPublished;

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          isPublished,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedVideo) {
      throw new ApiError(404, "Video does not exist");
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedVideo,
          "Publish status toggled successfully"
        )
      );
  } else {
    throw new ApiError(404, "Video does not exist");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  viewVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
