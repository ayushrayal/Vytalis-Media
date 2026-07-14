/**
 * ErrorService - Centralized error formatter and logger
 */
class ErrorService {
  /**
   * Log error details with context
   */
  static log(type, error, context = {}) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR_${type.toUpperCase()}]`, {
      message: error.message || error,
      context,
      stack: error.stack
    });
  }

  /**
   * Format Meta API error response and return clean error object
   */
  static formatMetaError(error) {
    this.log('META_API', error);
    
    // Check if error is from Facebook Graph API (axios/fetch structure)
    const fbError = error.response?.data?.error || error.error || {};
    const message = fbError.message || error.message || 'Unknown Meta API error occurred.';
    const code = fbError.code;
    const subcode = fbError.error_subcode;

    let userFriendlyMessage = 'Meta Ads API error: ' + message;
    let actionRequired = 'none';

    // Parse Meta API expired / invalid token errors
    // Codes: 190 (Invalid OAuth access token), 102 (Session key expired), etc.
    if (code === 190 || code === 102 || subcode === 463 || subcode === 467) {
      userFriendlyMessage = 'Your Meta Access Token is invalid, expired, or has been revoked. Please update your Meta Access Token in your profile settings.';
      actionRequired = 'reauthenticate';
    } else if (code === 17 || code === 4 || code === 613) {
      userFriendlyMessage = 'Meta Ads API rate limit reached. Please wait a few minutes and try again.';
      actionRequired = 'wait';
    } else if (code === 273 || code === 270) {
      userFriendlyMessage = 'Permission denied. Ensure your Meta Access Token has the ads_read permission for this Account ID.';
      actionRequired = 'check_permissions';
    }

    return {
      success: false,
      errorType: 'META_API_ERROR',
      message: userFriendlyMessage,
      actionRequired,
      details: process.env.NODE_ENV === 'development' ? fbError : undefined
    };
  }

  /**
   * Format OpenAI API error
   */
  static formatOpenAIError(error) {
    this.log('OPENAI_API', error);
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
    // If headers already sent, delegate to default Express handler
    if (res.headersSent) {
      return next(err);
    }

    // Determine type of error
    if (err.errorType === 'META_API_ERROR' || err.config?.url?.includes('graph.facebook.com')) {
      const formatted = ErrorService.formatMetaError(err);
      return res.status(401).json(formatted);
    }

    if (err.errorType === 'OPENAI_API_ERROR' || err.config?.url?.includes('api.openai.com')) {
      const formatted = ErrorService.formatOpenAIError(err);
      return res.status(502).json(formatted);
    }

    // Default server error
    ErrorService.log('SERVER', err, { url: req.originalUrl, method: req.method });
    
    res.status(err.status || 500).json({
      success: false,
      errorType: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

export default ErrorService;
