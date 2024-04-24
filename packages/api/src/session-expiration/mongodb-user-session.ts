import SessionExpiration from './createSessionExpiration';

/**
 * Session expiration for user MongoDB Session.
 */
export const sessionExpiration = new SessionExpiration({
  duration: 14 * 24 * 60 * 60, // 14 days,
  refreshThreshold: 0.5, // 7 days
});
