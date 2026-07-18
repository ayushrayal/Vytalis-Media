import Logger from '../utils/logger.js';
import metaApi from '../config/metaApi.js';

/**
 * ErrorService - Centralized error formatter and logger
 */
class ErrorService {
  /**
   * Log error details with context
   */
  static log(type, error, context = {}) {
    Logger.error(`[ERROR_${type.toUpperCase()}]`, error, context.requestId || '');
  }

  /**
   * Format Meta API error response and return clean error object
   */
  static formatMetaError(error, requestId = '') {
    this.log('META_API', error, { requestId });
    
    // Check if error is from Facebook Graph API (axios/fetch structure)
    const fbError = error.response?.data?.error || error.error || {};
    const message = fbError.message || error.message || '';
    const code = fbError.code || error.metaErrorCode;
    const subcode = fbError.error_subcode || error.metaSubcode;

    let userFriendlyMessage = 'Meta dashboard service unavailable.';
    let errorType = error.errorType || 'META_API_ERROR';
    let actionRequired = 'none';

    if (errorType === 'META_TOKEN_MISSING' || message.toLowerCase().includes('missing')) {
      errorType = 'META_TOKEN_MISSING';
      userFriendlyMessage = 'Meta Ad Account ID or Access Token is missing. Please update your profile.';
      actionRequired = 'reauthenticate';
    } else if (
      errorType === 'META_TOKEN_EXPIRED' ||
      code === 190 || code === 102 || subcode === 463 || subcode === 467 ||
      message.toLowerCase().includes('token') || message.toLowerCase().includes('session')
    ) {
      errorType = 'META_TOKEN_EXPIRED';
      userFriendlyMessage = 'Meta access token has expired or is invalid. Please reconnect your account.';
      actionRequired = 'reauthenticate';
    } else if (
      errorType === 'META_ACCOUNT_NOT_FOUND' ||
      (code === 100 && message.toLowerCase().includes('account'))
    ) {
      errorType = 'META_ACCOUNT_NOT_FOUND';
      userFriendlyMessage = 'Meta ad account not found or access denied.';
    } else if (
      errorType === 'META_TIMEOUT' ||
      (!code && (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout') || message.toLowerCase().includes('connect') || message.toLowerCase().includes('econnreset') || message.toLowerCase().includes('etimedout')))
    ) {
      errorType = 'META_TIMEOUT';
      userFriendlyMessage = 'Meta Graph API request timed out.';
      actionRequired = 'retry';
    } else if (
      code === 17 || code === 4 || code === 613 || subcode === 80004 ||
      message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many calls')
    ) {
      errorType = 'META_API_ERROR';
      userFriendlyMessage = 'Meta is temporarily limiting requests. Please try again in a few minutes.';
      actionRequired = 'wait';
    }

    const diagnostics = process.env.NODE_ENV !== 'production'
      ? {
          requestId: error.metaRequestId || requestId || 'N/A',
          graphApiVersion: error.metaGraphVersion || metaApi.version || 'v20.0',
          metaErrorCode: error.metaErrorCode || code || 'N/A',
          retryCount: error.metaRetryCount !== undefined ? error.metaRetryCount : 0,
          cacheStatus: error.metaCacheStatus || 'MISS',
          adAccountId: error.metaAdAccountId || 'N/A'
        }
      : undefined;

    return {
      success: false,
      errorType,
      message: userFriendlyMessage,
      actionRequired,
      ...(diagnostics ? { diagnostics } : {})
    };
  }

  /**
   * Format OpenAI API error
   */
  static formatOpenAIError(error, requestId = '') {
    this.log('OPENAI_API', error, { requestId });
    const message = error.response?.data?.error?.message || error.message || 'Unknown OpenAI error occurred.';
    return {
      success: false,
      errorType: 'OPENAI_API_ERROR',
      message: 'AI Analysis Error: ' + message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    };
  }

  /**
   * Centralized Express error handler middleware
   */
  static handleExpressError(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    const requestId = req.requestId || '';

    // Database errors (Mongoose/MongoDB)
    if (
      err.name === 'MongoError' ||
      err.name === 'MongoServerError' ||
      err.name === 'CastError' ||
      err.name === 'ValidationError' ||
      err.errorType === 'DATABASE_ERROR'
    ) {
      ErrorService.log('DATABASE', err, { url: req.originalUrl, method: req.method, requestId });
      return res.status(500).json({
        success: false,
        errorType: 'DATABASE_ERROR',
        message: 'Database operation failed.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // Meta API & Token errors
    if (
      err.errorType?.startsWith('META_') ||
      err.errorType === 'USER_NOT_FOUND' ||
      err.config?.url?.includes('graph.facebook.com')
    ) {
      const formatted = ErrorService.formatMetaError(err, requestId);
      let status = err.status;
      if (!status) {
        if (formatted.errorType === 'META_TOKEN_MISSING') status = 400;
        else if (formatted.errorType === 'META_TOKEN_EXPIRED') status = 401;
        else if (formatted.errorType === 'META_ACCOUNT_NOT_FOUND' || formatted.errorType === 'USER_NOT_FOUND') status = 404;
        else if (formatted.errorType === 'META_TIMEOUT' || formatted.errorType === 'META_API_ERROR') status = 503;
        else status = 503;
      }

      // Dev-only logs
      if (process.env.NODE_ENV !== 'production') {
        const fbError = err.response?.data?.error || {};
        const endpoint = err.metaEndpoint || 'N/A';
        const cleanUrl = `https://graph.facebook.com/${metaApi.version}/${endpoint}`;
        
        console.error(`[Development Error Diagnostics]
  Request ID:          ${requestId}
  Route:               ${req.originalUrl || req.url}
  Controller:          ${err.controller || 'N/A'}
  Service:             ${err.service || 'N/A'}
  Meta Endpoint:       ${endpoint}
  Graph API URL:       ${cleanUrl}
  Request Fields:      ${err.fields || 'N/A'}
  Response Status:     ${status}
  Meta Error Code:     ${err.metaErrorCode || fbError.code || 'N/A'}
  Meta Error Subcode:  ${err.metaSubcode || fbError.error_subcode || 'N/A'}
  Meta Error Message:  ${fbError.message || err.message}
  Stack Trace:
${err.stack}
--------------------------------------------------`);
      }

      return res.status(status).json(formatted);
    }

    if (err.errorType === 'OPENAI_API_ERROR' || err.config?.url?.includes('api.openai.com')) {
      const formatted = ErrorService.formatOpenAIError(err, requestId);
      return res.status(err.status || 503).json(formatted);
    }

    // Default server error
    ErrorService.log('SERVER', err, { url: req.originalUrl, method: req.method, requestId });
    
    res.status(err.status || 500).json({
      success: false,
      errorType: err.errorType || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

export default ErrorService;
