/**
 * Get a user-friendly error message from an API error
 */
export const getFriendlyErrorMessage = (err) => {
  if (!err) {
    return 'Something went wrong while loading this section.';
  }

  // If backend already formatted a user-friendly message, return it
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  const message = err.message || '';
  const status = err.response?.status;
  const data = err.response?.data;

  // Rate limiting (429)
  if (status === 429 || message.includes('429') || /rate limit/i.test(message) || /too many calls/i.test(message)) {
    return 'Meta is temporarily limiting requests. Showing the most recently available data. Please refresh in a few minutes.';
  }

  // Too much data requested
  if (/reduce the amount of data/i.test(message) || /reduce data/i.test(message) || (data && JSON.stringify(data).includes('reduce the amount of data'))) {
    return 'This section is temporarily unavailable because Meta could not process the request.';
  }

  // Authentication issue (401)
  if (status === 401 || /auth/i.test(message) || /token/i.test(message) || /expired/i.test(message)) {
    return 'Your Meta account connection has expired. Please reconnect your account.';
  }

  // Network / server connection error
  if (!err.response || /network/i.test(message) || /timeout/i.test(message) || /connect/i.test(message)) {
    return 'Unable to reach Meta servers. Please try again.';
  }

  return 'Something went wrong while loading this section.';
};
