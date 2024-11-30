/**
 * Group together all database code and call them all at once
 */

type Task = () => Promise<unknown>;

let queue: Task[] = [];

export function populateQueue(task: Task) {
  queue.push(task);
}

export function populateExecuteAll() {
  try {
    return Promise.all(queue.map((task) => task()));
  } finally {
    queue = [];
  }
}
