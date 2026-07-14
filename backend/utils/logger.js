class Logger {
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
    payloadSize
  }) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    console.log(`[Meta API Performance Log]
  Endpoint:      ${endpoint}
  Response Time: ${responseTime}ms
  Queue Wait:    ${queueWaitTime}ms
  Queue Size:    ${queueSize}
  Cache Status:  ${cacheHit ? 'HIT' : 'MISS'}
  Retries:       ${retryCount}
  Payload Size:  ${payloadSize ? (payloadSize / 1024).toFixed(2) + ' KB' : '0 KB'}
  Timestamp:     ${new Date().toISOString()}
----------------------------------------`);
  }
}

export default Logger;
