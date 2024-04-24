import SessionExpiration from './createSessionExpiration';

/**
 * Session expiration DynamoDB connection for subscriptions
 */
export const sessionExpiration = new SessionExpiration({
  duration: 3 * 60 * 60, // 3 hours
  refreshThreshold: 1 / 3, // 1 hour
});

export const defaultTtl = sessionExpiration.newExpireAt.bind(sessionExpiration);
export const tryRefreshTtl = sessionExpiration.tryRefreshTtl.bind(sessionExpiration);
