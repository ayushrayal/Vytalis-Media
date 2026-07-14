const diagnosticsHistory = [];
const maxHistorySize = 100;
let lastError = null;

class DiagnosticsService {
  static isProd() {
    return process.env.NODE_ENV === 'production';
  }

  static collect(data) {
    if (this.isProd()) return null;

    let maskedToken = undefined;
    if (data.accessToken) {
      const tokenStr = String(data.accessToken);
      maskedToken = tokenStr.length > 8 
        ? `${tokenStr.substring(0, 4)}...${tokenStr.substring(tokenStr.length - 4)}`
        : '***';
    }

    const record = {
      userId: data.userId || null,
      metaAccountId: data.metaAccountId || null,
      businessId: data.businessId || null,
      graphApiVersion: data.graphApiVersion || null,
      dateRange: data.dateRange || null,
      cacheStatus: data.cacheStatus || 'miss',
      queueStatus: data.queueStatus || { running: 0, waiting: 0 },
      retryCount: data.retryCount || 0,
      requestDurationMs: data.requestDurationMs || 0,
      payloadSize: data.payloadSize || 0,
      apiEndpoint: data.apiEndpoint || null,
      accessTokenMasked: maskedToken,
      timestamp: new Date().toISOString()
    };

    diagnosticsHistory.unshift(record);
    if (diagnosticsHistory.length > maxHistorySize) {
      diagnosticsHistory.pop();
    }

    return record;
  }

  static recordError(err) {
    if (this.isProd()) return;
    lastError = {
      code: err.metaErrorCode || err.response?.data?.error?.code || 'N/A',
      message: err.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  static getLastError() {
    return lastError;
  }

  static getHistory() {
    return diagnosticsHistory;
  }

  static clearHistory() {
    diagnosticsHistory.length = 0;
  }
}

export default DiagnosticsService;
