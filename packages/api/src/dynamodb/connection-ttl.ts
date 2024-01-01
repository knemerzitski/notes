/**
 * Connection duration in seconds
 */
const DURATION_IN_SECONDS = 3 * 60 * 60; // 3 hours

/**
 * Refresh session when session is about to expire
 * based on a threshold. E.g with threshold 0.5
 * session is updated when it's at halfway point between
 * maximum and remaining session duration.
 */
const REFRESH_THRESHOLD = 1 / 3; // 1 hour

export function defaultTtl() {
  return Math.floor(Date.now() + DURATION_IN_SECONDS * 1000);
}

/**
 *
 * @param currentTtl
 * @returns defaultTtl if {@link currentTtl} has passed threshold
 * otherwise returns same {@link currentTtl}
 */
export function tryRefreshTtl(currentTtl: number): number {
  const now = Date.now();
  if (currentTtl - now <= DURATION_IN_SECONDS * REFRESH_THRESHOLD * 1000) {
    return defaultTtl();
  }
  return currentTtl;
}
