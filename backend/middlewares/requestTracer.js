import crypto from 'crypto';

/**
 * requestTracer - Middleware to tag requests with a unique ID for diagnostics
 */
const requestTracer = (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export default requestTracer;
