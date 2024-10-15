export class DefinedMap<K, V> {
  constructor(
    private readonly map: Pick<Map<K, V>, 'get' | 'set'>,
    private readonly create: (key: K) => V
  ) {}

  get(key: K): V {
    let value = this.map.get(key);
    if (value === undefined) {
      value = this.create(key);
      this.map.set(key, value);
    }
    return value;
  }
}
