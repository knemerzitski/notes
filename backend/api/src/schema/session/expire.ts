/**
 * Session duration in seconds
 */
const DURATION_IN_SECONDS = 14 * 24 * 60 * 60; // 14 days

/**
 * Refresh session when session is about to expire
 * based on a threshold. E.g with threshold 0.5
 * session is updated when it's at halfway point between
 * maximum and remaining session duration.
 */
const REFRESH_THRESHOLD = 0.5; // 7 days

/**
 *
 * @param expireAt Date object to update
 * @returns {Date} updated {@link expireAt} instance with maximum session duration
 */
function updateExpireAt(expireAt: Date): Date {
  expireAt.setTime(Date.now() + DURATION_IN_SECONDS * 1000);
  return expireAt;
}

/**
 *
 * @returns Fresh Date object with time set to maximum session duration
 */
export function newExpireAt() {
  return updateExpireAt(new Date());
}

/**
 * Attempts to refresh if it's below threshold
 * @param expireAt Date session instance to refresh
 * @returns  was {@link expireAt} changed
 */
export function tryRefreshExpireAt(expireAt: Date): boolean {
  const now = Date.now();
  if (expireAt.getTime() - now <= DURATION_IN_SECONDS * REFRESH_THRESHOLD * 1000) {
    updateExpireAt(expireAt);
    return true;
  }

  return false;
}
