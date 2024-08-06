class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message); // Calls the constructor of the parent class (Error) with the message parameter
    this.statusCode = statusCode; // New property specific to ApiError
    this.data = null; //New property specific to ApiError
    this.message = message; // Redundant, since `super(message)` already sets this.message
    this.success = false; //New property specific to ApiError
    this.errors = errors; //New property specific to ApiError

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor); // Captures the current stack trace
    }
  }
}

export { ApiError };
