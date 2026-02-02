/**
 * Maps raw API/network errors to user-friendly messages.
 * Use this whenever displaying errors to users (toasts, form messages, etc.).
 */

/**
 * @param {Error & { status?: number }} error - Caught error (may have status for HTTP errors)
 * @param {string} fallback - Default message when we can't map the error
 * @returns {string} User-friendly message
 */
export function getFriendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const message = (error.message || '').toLowerCase();
  const status = error.status ?? error.statusCode ?? error.code;

  // Network / connectivity
  if (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('networkrequestfailed') ||
    message.includes('connection refused')
  ) {
    return 'Check your internet connection and try again.';
  }

  // Timeout
  if (message.includes('timeout') || message.includes('aborted') || error.name === 'AbortError') {
    return 'Request took too long. Please try again.';
  }

  // HTTP status
  if (status === 401 || status === 403) {
    return 'Please sign in again.';
  }
  if (status >= 500 || message.includes('500')) {
    return 'Something went wrong on our end. Please try again later.';
  }
  if (status === 404) {
    return 'That item was not found. It may have been removed.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  return fallback;
}
