const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    console.error("UNEXPECTED ERROR:", err); // log full details server-side only
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : "Something went wrong on the server",
      statusCode,
    },
  });
};

module.exports = errorHandler;