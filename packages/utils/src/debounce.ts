type Callback = () => void;

export class Debounce {
  private readonly wait: number;
  private readonly maxWait: number | undefined;

  private timeoutId: NodeJS.Timeout | null = null;

  private firstInvokeTime: number | null = null;

  private readonly trigger = () => {
    this.reset();
    this.callback();
  };

  constructor(
    private readonly callback: Callback,
    options: {
      /**
       * Time in milliseconds
       */
      wait: number;
      /**
       * Wait at most this long.
       */
      maxWait?: number;
    }
  ) {
    this.wait = options.wait;
    this.maxWait = options.maxWait;
  }

  invoke() {
    this.clearTimeout();

    let wait = this.wait;

    if (this.maxWait !== undefined) {
      if (this.firstInvokeTime === null) {
        this.firstInvokeTime = Date.now();
      } else {
        const elapsedSinceFirstInvoke = Date.now() - this.firstInvokeTime;
        wait = Math.min(wait, this.maxWait - elapsedSinceFirstInvoke);
      }
    }

    if (wait <= 0) {
      this.callback();
    } else {
      this.timeoutId = setTimeout(this.trigger, wait);
    }
  }
  
  isPending(): boolean {
    return this.timeoutId !== null;
  }

  cancel() {
    this.reset();
  }

  flush() {
    if (!this.isPending()) {
      return;
    }

    this.trigger();
  }

  private clearTimeout() {
    if (this.timeoutId === null) {
      return;
    }

    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private reset() {
    this.clearTimeout();
    this.firstInvokeTime = null;
  }
}
