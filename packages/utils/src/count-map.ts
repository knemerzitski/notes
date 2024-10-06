export class CountMap<T> {
  private readonly map = new Map<T, number>();

  constructor(private initial = 0) {}

  get(key: T) {
    return this.map.get(key) ?? this.initial;
  }

  inc(key: T) {
    this.map.set(key, this.get(key) + 1);
  }

  dec(key: T) {
    this.map.set(key, this.get(key) - 1);
  }

  delete(key: T) {
    this.map.delete(key);
  }
}
