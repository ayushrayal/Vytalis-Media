import AuthService from '../services/authService.js';
import UserService from '../services/userService.js';
import Logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  let token = null;
  let tokenSource = 'None';
  let jwtVerificationResult = 'Not Attempted';
  let decoded = null;
  let userId = null;
  let failureReason = '';

  try {
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie || '';

    // Determine token source
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      tokenSource = 'Authorization Header';
    } else if (cookieHeader) {
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
        tokenSource = 'Cookie';
      }
    }

    if (!token) {
      failureReason = 'Access denied. No authentication token provided.';
      logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, false, failureReason);
      return res.status(401).json({
        success: false,
        errorType: 'UNAUTHORIZED',
        message: failureReason
      });
    }

    // Verify token
    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_key';
      decoded = jwt.verify(token, secret);
      jwtVerificationResult = 'Success';
      userId = decoded.userId;
    } catch (jwtErr) {
      jwtVerificationResult = jwtErr.name || 'JWT Verification Error';
      if (jwtErr.name === 'TokenExpiredError') {
        failureReason = 'Session expired. Please log in again.';
      } else {
        failureReason = 'Invalid or expired session token.';
      }
      logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, false, failureReason);
      return res.status(401).json({
        success: false,
        errorType: 'UNAUTHORIZED',
        message: failureReason
      });
    }

    // Fetch user details (MongoDB query)
    const user = await UserService.findUserById(decoded.userId);
    if (!user) {
      failureReason = 'Session invalid. User no longer exists.';
      logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, false, failureReason);
      return res.status(401).json({
        success: false,
        errorType: 'UNAUTHORIZED',
        message: failureReason
      });
    }

    // Verify account is active
    if (!user.isActive) {
      failureReason = 'Your account is deactivated. Please contact support.';
      logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, false, failureReason);
      return res.status(403).json({
        success: false,
        errorType: 'DEACTIVATED',
        message: failureReason
      });
    }

    // Attach user mongoose document directly to request
    req.user = user;
    logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, true);
    next();
  } catch (error) {
    failureReason = error.message || 'Authentication system error.';
    logAuthAttempt(req, tokenSource, token, jwtVerificationResult, userId, false, failureReason);
    return res.status(401).json({
      success: false,
      errorType: 'UNAUTHORIZED',
      message: failureReason
    });
  }
};

const logAuthAttempt = (req, tokenSource, token, jwtResult, userId, success, reason = '') => {
  if (Logger.isProd()) return;
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie || '';
  
  console.log(`[Auth Telemetry]
  URL:                   ${req.originalUrl || req.url}
  Method:                ${req.method}
  Auth Header Present:   ${authHeader ? 'Yes' : 'No'}
  Cookie Present:        ${cookieHeader ? 'Yes' : 'No'}
  JWT Verify Result:     ${jwtResult}
  User ID:               ${userId || 'N/A'}
  Status:                ${success ? 'SUCCESS' : 'REJECTED'}
  ${!success ? `Rejection Reason:      ${reason}` : ''}
  --------------------------------------------------`);
};

export default authMiddleware;
