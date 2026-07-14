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
    const code = fbError.code;
    const subcode = fbError.error_subcode;

    let userFriendlyMessage = 'Something went wrong while loading this section.';
    let actionRequired = 'none';

    // 1. Authentication Error
    if (code === 190 || code === 102 || subcode === 463 || subcode === 467) {
      userFriendlyMessage = 'Your Meta account connection has expired. Please reconnect your account.';
      actionRequired = 'reauthenticate';
    } 
    // 2. Rate Limit Error
    else if (
      code === 17 || 
      code === 4 || 
      code === 613 || 
      subcode === 80004 || 
      message.toLowerCase().includes('rate limit') || 
      message.toLowerCase().includes('too many calls')
    ) {
      userFriendlyMessage = 'Meta is temporarily limiting requests. Showing the most recently available data. Please refresh in a few minutes.';
      actionRequired = 'wait';
    } 
    // 3. Reduce Data Error
    else if (
      message.toLowerCase().includes('reduce the amount of data') || 
      message.toLowerCase().includes('too much data') || 
      code === 1
    ) {
      userFriendlyMessage = 'This section is temporarily unavailable because Meta could not process the request.';
      actionRequired = 'reduce_data';
    }
    // 4. Network Error
    else if (
      !code && 
      (message.toLowerCase().includes('fetch') || 
       message.toLowerCase().includes('network') || 
       message.toLowerCase().includes('timeout') || 
       message.toLowerCase().includes('connect'))
    ) {
      userFriendlyMessage = 'Unable to reach Meta servers. Please try again.';
      actionRequired = 'retry';
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
      errorType: 'META_API_ERROR',
      message: userFriendlyMessage,
      actionRequired,
      diagnostics,
      details: process.env.NODE_ENV === 'development' ? fbError : undefined
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

    // Determine type of error
    if (err.errorType === 'META_API_ERROR' || err.config?.url?.includes('graph.facebook.com')) {
      const formatted = ErrorService.formatMetaError(err, requestId);
      const status = err.status || 502;

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

      // Add dev-only diagnostics on HTTP 502
      if (status === 502 && process.env.NODE_ENV !== 'production') {
        const fbError = err.response?.data?.error || {};
        formatted.devDiagnostics = {
          errorSource: err.errorType || 'Meta Ads API',
          controller: err.controller || 'N/A',
          service: err.service || 'N/A',
          metaEndpoint: err.metaEndpoint || 'N/A',
          metaErrorCode: err.metaErrorCode || fbError.code || 'N/A',
          metaSubcode: err.metaSubcode || fbError.error_subcode || 'N/A',
          metaMessage: fbError.message || err.message,
          originalStack: err.stack
        };
      }

      return res.status(status).json(formatted);
    }

    if (err.errorType === 'OPENAI_API_ERROR' || err.config?.url?.includes('api.openai.com')) {
      const formatted = ErrorService.formatOpenAIError(err, requestId);
      return res.status(err.status || 502).json(formatted);
    }

    // Default server error
    ErrorService.log('SERVER', err, { url: req.originalUrl, method: req.method, requestId });
    
    res.status(err.status || 500).json({
      success: false,
      errorType: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

export default ErrorService;
