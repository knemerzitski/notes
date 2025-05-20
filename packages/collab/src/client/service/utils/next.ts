export function next<T>(itr: Iterator<T>): T | undefined {
  const result = itr.next();
  if (result.done) {
    return;
  }

  return result.value;
}
