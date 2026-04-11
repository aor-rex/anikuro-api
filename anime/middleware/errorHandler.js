class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Check err.statusCode first (CustomError sets this correctly)
  // before falling back to err.response?.status for HTTP errors
  const statusCode = err.statusCode || err.response?.status || 500;
  const message = err.message || "Something went wrong";

  console.error(`Error: ${message} (Status Code: ${statusCode})`);

  const response = {
    status: statusCode,
    message: message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  CustomError,
  errorHandler,
};
