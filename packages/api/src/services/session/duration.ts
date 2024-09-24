export interface SessionDurationConfig {
  /**
   * Session duration in milliseconds
   */
  readonly duration: number;
  /**
   * Condition for refreshing existing time to max duration. Threshold is percentage of
   * duration expressed with value between 0 and 1. \
   * For exmaple threshold 0.5 allows refreshing time when in half past duration.
   *
   * @default 0.5
   */
  readonly refreshThreshold?: number;
}

export class SessionDuration {
  private readonly duration: number;
  private readonly refreshThreshold: number;

  constructor(config: SessionDurationConfig) {
    this.duration = config.duration;
    this.refreshThreshold = config.refreshThreshold ?? 0.5;
  }

  /**
   * @returns Unix timestamp + config.duration
   */
  new(): number {
    return Math.floor(Date.now() + this.duration);
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

    if (time - now <= this.duration * this.refreshThreshold) {
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
