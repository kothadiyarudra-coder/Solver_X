/**
 * Global Error Handling Middleware — README Section 6
 *
 * Catches all unhandled errors from controllers and returns
 * the standard DevTrace error envelope:
 *   { success: false, error: { code, message } }
 */
const errorHandler = (err, req, res, next) => {
  // Log for backend debugging (stack only in dev)
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Middleware]', err.stack || err);
  } else {
    console.error('[Error Middleware]', err.message);
  }

  // ── MongoDB Duplicate Key Error (E11000) ──
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `Duplicate entry: ${field} '${value}' already exists.`,
      },
    });
  }

  // ── Mongoose Validation Error ──
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: messages.join('. '),
      },
    });
  }

  // ── Mongoose CastError (invalid ObjectId, Date, etc.) ──
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: `Invalid value for '${err.path}': ${err.value}`,
      },
    });
  }

  // ── SyntaxError from JSON parsing (malformed request body) ──
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON.',
      },
    });
  }

  // ── Custom error with statusCode (thrown from services) ──
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
};

module.exports = errorHandler;
