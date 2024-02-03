type Task = () => void;

interface ScheduledEvent {
  startTime: number;
  task: Task;
}

/**
 * Scheduler runs functions (tasks) based on manually invoked time passage.
 * Earlier tasks are run first like flow of time.
 */
export class Scheduler {
  private currentTime = 0;

  private scheduledEvents: ScheduledEvent[] = [];

  public autoRun: boolean;

  constructor(autoRun = false) {
    this.autoRun = autoRun;
  }

  /**
   *
   * @param delay Delay until task is invoked. Delay is arbitrary and tied to
   * value passed to {@link run} method.
   * @param task Task to schedule
   */
  add(delay: number, task: Task) {
    if (this.autoRun) {
      task();
      return;
    }

    const scheduledEvent: ScheduledEvent = {
      startTime: this.currentTime + delay,
      task: task,
    };

    this.scheduledEvents.push(scheduledEvent);
  }

  private peekNextScheduledEvent() {
    if (this.scheduledEvents.length === 0) return;

    // Earlier event at the end of array
    this.scheduledEvents.sort((a, b) => b.startTime - a.startTime);

    return this.scheduledEvents[this.scheduledEvents.length - 1];
  }

  /**
   * Invoke all tasks in order of time passed {@link passedTime}.
   * @param passedTime If not defined, then all tasks are invoked.
   */
  run(passedTime = Number.POSITIVE_INFINITY) {
    const endTime = this.currentTime + (Number.isFinite(passedTime) ? passedTime : 0);

    let timeRemaining = passedTime;
    let currentEntry: ScheduledEvent | undefined;
    while (
      (currentEntry = this.peekNextScheduledEvent()) &&
      (timeRemaining -= currentEntry.startTime - this.currentTime) >= 0
    ) {
      this.scheduledEvents.pop();

      this.currentTime = currentEntry.startTime;
      currentEntry.task();
    }

    this.currentTime = endTime;
  }

  /**
   * @returns Summary of scheduler state.
   */
  getState() {
    return {
      currentTime: this.currentTime,
      eventCount: this.scheduledEvents.length,
      eventTimes: this.scheduledEvents.map(({ startTime }) => startTime),
    };
  }
}
