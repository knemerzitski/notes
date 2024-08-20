export interface SessionDurationConfig {
  /**
   * Session duration in seconds
   */
  readonly duration: number;
  /**
   * Condition for refreshing existing time to max duration. Threshold is percentage of
   * duration expressed with value between 0 and 1. \
   * For exmaple threshold 0.5 allows refreshing time when in half past duration.
   */
  readonly refreshThreshold: number;
}

export class SessionDuration {
  private readonly config: SessionDurationConfig;

  constructor(config: SessionDurationConfig) {
    this.config = config;
  }

  /**
   * @returns Unix timestamp + config.duration
   */
  new(): number {
    return Math.floor(Date.now() + this.config.duration * 1000);
  }

  /**
   *
   * @returns New time as Date object
   */
  newDate() {
    return new Date(this.new());
  }

  /**
   * Attempt to refresh time if it's past threshold.
   *
   * @param time
   * @returns If refreshed then time, otherwise old time
   */
  tryRefresh(time: number): number {
    const now = Date.now();

    if (time - now <= this.config.duration * this.config.refreshThreshold * 1000) {
      return this.new();
    }

    return time;
  }

  /**
   * Attempt to refresh time if it's past threshold by modifying given Date instance.
   * @returns If refreshed then new Date object, otherwise old provided Date
   */
  tryRefreshDate(date: Readonly<Date>): Date {
    const time = date.getTime();

    const newTime = this.tryRefresh(time);
    if (time !== newTime) {
      return new Date(newTime);
    }

    return date;
  }
}
