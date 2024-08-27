import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// create playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const owner = req.user?._id;

  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedPlaylist = await Playlist.findOne({
    name,
    owner,
  });

  if (existedPlaylist) {
    throw new ApiError(400, "Playlist already exist");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating the playlist");
  }

  res
    .status(201)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

// get user playlists details
const getUserPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({
    owner: new mongoose.Types.ObjectId(`${req.user?._id}`),
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

// get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (isValidObjectId(playlistId)) {
    const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${playlistId}`),  // filters playlist for a specific playlistId.
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "playlistVideos",
          pipeline: [
            {
              $project: {
                thumbnail: 1,
                title: 1,
                description: 1,
                views: 1,
              },
            },
          ],
        },
      }, // join the owner local field with the videos model. here the owner local field is a ObjectId, so this is utilised to join with the other model, this results are stored as videos. here we use project in a nested pipeline to get the required field from the videos model. so the owner will have these fields.
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
      }, // new fields are added to the playlist model, these fields are owner from the lookup. since the model already had fields with same name, which was earlier ObjectId, this is infact a replacement of that field with the lookup results
      {
        $unwind: "$playlistVideos",
      }, // unwind is applied here, because playlistVideos is a list containing the details of the videos in the playlist, so to access each video individually and for the ease of projecting unwind is applied
      {
        $project: {
          _id: "$playlistVideos._id", // id of the videos in the playlistVideos are taken for id to be unique.
          name: 1,
          description: 1,
          thumbnail: "$playlistVideos.thumbnail",
          videoTitle: "$playlistVideos.title",
          videoDescription: "$playlistVideos.description",
          views: "$playlistVideos.views",
          username: "$owner.username",
          fullName: "$owner.fullName",
          avatar: "$owner.avatar",
        },
      }, // here, each videos in the playlist has its unique videoId. since this is a list that is being returned adding field is not suitable, hence unwind. the name, description are taken from playlist model, and the thumbnail, title, description of video are taken from the playlistVideos field in the playlist model, which is an array of videos model items, the fullName, username, avatar is inside the owner field in the playlist model, so it is projected likedwise.
    ]);

    if (playlist.length === 0) {
      res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist does not have videos yet"));
    } else {
      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            playlist,
            "Playlist details fetched successfully"
          )
        );
    }
  } else {
    throw new ApiError(404, "Playlist does not exist");
  }
});

//add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (isValidObjectId(videoId) && isValidObjectId(playlistId)) {
    const addedVideo = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $addToSet: {
          videos: videoId,
        },
      },
      {
        new: true,
      }
    );

    if (!addedVideo) {
      throw new ApiError(404, "Playlist does not exist");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, addedVideo, "Video added to playlist successfully")
      );
  } else {
    throw new ApiError(404, "Playlist or video does not exist");
  }
});

// remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (isValidObjectId(playlistId) && isValidObjectId(videoId)) {
    const initialPlaylist = await Playlist.findById(playlistId);
    const initialPlaylistLength = initialPlaylist.videos.length;

    try {
      await Playlist.updateOne(
        { _id: playlistId },
        {
          $pull: { videos: videoId },
        },
        {
          new: true,
        }
      );

      const updatedPlaylist = await Playlist.findById(playlistId);
      const updatedPlaylistLength = updatedPlaylist.videos.length;

      if (initialPlaylistLength === updatedPlaylistLength) {
        throw new ApiError(404, "Video does not exist in the playlist");
      }

      res
        .status(200)
        .json(
          new ApiResponse(200, {}, "Video removed from playlist successfully")
        );
    } catch (error) {
      throw new ApiError(
        500,
        error?.message || "Something went wrong while removing the video"
      );
    }
  } else {
    throw new ApiError(404, "Playlist or video does not exist");
  }
});

// update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

// delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist,
};
