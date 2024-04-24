const MILLISECOND_TO_SECOND = 1000;

export interface SessionExpirationConfig {
  /**
   * Session duration in seconds
   */
  readonly duration: number;
  /**
   * Refresh session to {@link duration} when
   * remaining session is less than {@link duration} times {@link refreshThreshold}
   */
  readonly refreshThreshold: number;
}

export default class SessionExpiration {
  private config: SessionExpirationConfig;

  constructor(config: SessionExpirationConfig) {
    this.config = config;
  }

  /**
   * @returns Maximum session expire at in seconds
   */
  newExpireAt(): number {
    return Math.floor(Date.now() + this.config.duration * MILLISECOND_TO_SECOND);
  }

  /**
   *
   * @param currentTtl
   * @returns defaultTtl if {@link currentTtl} has passed threshold
   * otherwise returns same {@link currentTtl}
   */
  tryRefreshTtl(currentTtl: number): number {
    const now = Date.now();
    if (
      currentTtl - now <=
      this.config.duration * this.config.refreshThreshold * MILLISECOND_TO_SECOND
    ) {
      return this.newExpireAt();
    }
    return currentTtl;
  }

  /**
   *
   * @returns New Date object with maximum session expire at in seconds
   */
  newExpireAtDate() {
    return new Date(this.newExpireAt());
  }

  /**
   * Attempts to refresh if it's below threshold
   * @param expireAtDate Date session instance to refresh
   * @returns was {@link expireAtDate} time changed
   */
  tryRefreshExpireAtDate(expireAtDate: Date): boolean {
    const expireAt = expireAtDate.getTime();
    const newExpireAt = this.tryRefreshTtl(expireAt);
    if (expireAt !== newExpireAt) {
      expireAtDate.setTime(newExpireAt);
      return true;
    }
    return false;
  }
}
