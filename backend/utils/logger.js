class Logger {
  static isProd() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Log Meta API metrics in development mode only
   */
  static logMetaRequest({
    endpoint,
    responseTime,
    queueWaitTime,
    queueSize,
    cacheHit,
    retryCount,
    payloadSize,
    requestId = 'N/A'
  }) {
    if (this.isProd()) {
      return;
    }

    console.log(`[Meta API Log] [${requestId}]
  Endpoint:      ${endpoint}
  Duration:      ${responseTime}ms
  Queue Wait:    ${queueWaitTime}ms
  Queue Size:    ${queueSize}
  Cache:         ${cacheHit ? 'HIT' : 'MISS'}
  Retries:       ${retryCount}
  Payload Size:  ${payloadSize ? (payloadSize / 1024).toFixed(2) + ' KB' : '0 KB'}
  Timestamp:     ${new Date().toISOString()}
----------------------------------------`);
  }

  /**
   * Log startup and diagnostics
   */
  static info(message, requestId = '') {
    const prefix = requestId ? `[${requestId}] ` : '';
    console.log(`[INFO] ${prefix}${message}`);
  }

  /**
   * Log warning events in both dev and production
   */
  static warn(message, requestId = '') {
    const prefix = requestId ? `[${requestId}] ` : '';
    console.warn(`[WARN] ${prefix}${message}`);
  }

  /**
   * Log errors and critical failures in both dev and production
   */
  static error(message, error = null, requestId = '') {
    const prefix = requestId ? `[${requestId}] ` : '';
    const errDetails = error ? ` - Details: ${error.message || error}` : '';
    const stack = error && error.stack && !this.isProd() ? `\n${error.stack}` : '';
    console.error(`[ERROR] ${prefix}${message}${errDetails}${stack}`);
  }
}

export default Logger;
