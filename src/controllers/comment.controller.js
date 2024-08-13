import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  //TODO: get all comments for a video
});

const addComment = asyncHandler(async (req, res) => {
  //TODO: add a comment to a video
  const { videoId } = req.params;
});

const updateComment = asyncHandler(async (req, res) => {
  //TODO: update a comment
  const { commentId } = req.params;
});

const deleteComment = asyncHandler(async (req, res) => {
  //TODO: delete a comment
  const { commentId } = req.params;
});

export { getVideoComments, addComment, updateComment, deleteComment };
