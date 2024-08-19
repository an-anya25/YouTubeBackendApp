import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// healthcheck response that simply returns the OK status as json with a message
const healthcheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "All OK"));
});

export { healthcheck };
