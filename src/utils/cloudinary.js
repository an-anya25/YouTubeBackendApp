import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("Did not get localfile path");
      return null;
    }

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("File is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation failed. done in synchronous way
    console.log(error);
    return null;
  }
};

const deleteFile = async (publicId, resourceType) => {
  try {
    const deletedFile = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return deletedFile;
  } catch (error) {
    throw new ApiError(
      500,
      error?.message ||
        "Something went wrong while deleting the file from cloudinary"
    );
  }
};

export { uploadOnCloudinary, deleteFile };
