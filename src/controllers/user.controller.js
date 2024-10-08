import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// GENERATE ACCESS AND REFRESH TOKEN
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // save refresh token to db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  // get user details form frontend
  // validation - not empty
  // check if user already exist: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  // get user details form frontend
  const { fullName, email, username, password } = req.body;

  // validation - not empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exist: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // check for images, check for avatar

  // const avatarLocalPath = req.files?.avatar[0]?.path; undefined error occur
  // const coverImageLocalPath = req.files?.coverImage[0]?.path; undefined error occur

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(
      400,
      "Avatar is required. Error uploading to cloudinary. Cannot get cloudinary path url"
    );
  }

  // create user object - create entry db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    avatarPublicId: avatar.public_id,
    coverImage: coverImage?.url || "",
    coverImagePublicId: coverImage?.public_id || "",
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));

  //end
});

// LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  // get data from req.body
  // check if username or email exist
  // find the user
  // password check
  // generate access and refresh token
  // send cookies

  // get data from req.body
  const { username, email, password } = req.body;

  // check if username or email exist
  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required");
  }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user doesnt exist
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // check if password is matching - here the User has methods of mongoose to interact with MongoDB but the user instance has the methods that we have created associated with the schema
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials. Invalid password.");
  }

  // generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // before calling the generateAccessAndRefreshToken() the user instance has its refreshToken field as empty in db. after that function call finishes only the db is updated. so create a new user instance or update existing instance (this depends on whether that operation is expensive or not). and while sending the response to user password and refresh token fields are not required

  //create logged in user instance
  const loggedInUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );

  // send cookies

  //cookies by default is modifyable in the frontend, by using these options it will only be modifyable in the server side
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from the document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// REFRESH ACCESS TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: refreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// UPDATE PASSWORD
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// GET CURRENT USER
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// UPDATE ACCOUNT DETAILS
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Accout details updated successfully"));
});

// UPDATE AVATAR
const updateUserAvatar = asyncHandler(async (req, res) => {
  const oldUser = await User.findById(req.user?._id);

  const oldAvatarPublicId = oldUser.avatarPublicId;

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const deletedFile = await deleteFile(oldAvatarPublicId, "image");
  if (!deletedFile) {
    throw new ApiError(500, "Could not delete the old avatar");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar to cloudindary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
        avatarPublicId: avatar.public_id,
      },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// UPDATE COVER IMAGE
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const oldUser = await User.findById(req.user?._id);

  const oldCoverImagePublicId = oldUser.coverImagePublicId;

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const deletedFile = await deleteFile(oldCoverImagePublicId, "image");

  if (!deletedFile) {
    throw new ApiError(500, "Could not delete the old cover image");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image to cloudindary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
        coverImagePublicId: coverImage.public_id,
      },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// GET USER CHANNEL PROFILE DETAILS
const getUserChanneProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), // filters channel for a specific userId
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    }, // join the _id local field with the channel in the subscriptions model as subscribers
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    }, // join the _id local field with the subscriber in the subscriptions model as subscribedTo.
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    }, // new fields are added which are the size of the subscribers and subscribedTo and isSubscribed which checks if the current user is subscribed to the channel
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    }, // the fullName, username, subscribersCount, channelsSubscribedTo, isSubscribed, avatar, coverImage and email fields are taken from the user model
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// GET WATCH HISTORY
const getWatchHistory = asyncHandler(async (req, res) => {
  const watchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(`${req.user._id}`), //  filters user for the current userId
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
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
          }, // join the owner local field of videos model with the users model. use project to project the required fields
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          }, // add/replace the owner field to the video model
        ],
      }, // join the user model with local field as watchHistory from the video model
    },
    {
      $unwind: "$watchHistory", // since watchHistory is an list of users (check model), unwind is used
    },
    {
      $project: {
        _id: "$watchHistory._id", // unique id of the watchHistory
        thumbnail: "$watchHistory.thumbnail",
        title: "$watchHistory.title",
        description: "$watchHistory.description",
        views: "$watchHistory.views",
        username: "$watchHistory.owner.username",
        fullName: "$watchHistory.owner.fullName",
        avatar: "$watchHistory.owner.avatar",
      },
    }, // project the id of the watchHistory, which are actually ids of video model, thumbnail, title, description, views are taken from the watchHistory. username, fullName, avatar exist inside the owner field of watchHistory, so it is projected accordingly
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, watchHistory, "Watch history fetched successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChanneProfile,
  getWatchHistory,
};
