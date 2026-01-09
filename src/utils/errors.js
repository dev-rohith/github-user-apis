/**
 * Custom Error Classes
 * 
 * Custom error classes for handling different types of errors in the application
 */

/**
 * Error thrown when a resource is not found (404)
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when rate limit is exceeded (403)
 */
export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}

