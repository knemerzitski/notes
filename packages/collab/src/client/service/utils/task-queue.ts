export class TaskQueue {
  private running = false;

  private readonly queue: (() => void)[] = [];

  addAndFlush(task: () => void) {
    this.queue.push(task);
    this.flushQueue();
  }

  private flushQueue() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      let task: (() => void) | undefined;
      while ((task = this.queue.shift()) != null) {
        task();
      }
    } finally {
      this.running = false;
    }
  }
}
