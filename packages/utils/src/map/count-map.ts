import { DefinedMap } from './defined-map';

export class CountMap<T> {
  private readonly map;
  private readonly definedMap;

  constructor(map: Pick<Map<T, number>, 'get' | 'set'>, initial = 0) {
    this.map = map;
    this.definedMap = new DefinedMap(map, (_: T) => initial);
  }

  get(key: T) {
    return this.definedMap.get(key);
  }

  inc(key: T) {
    this.map.set(key, this.definedMap.get(key) + 1);
  }

  dec(key: T) {
    this.map.set(key, this.definedMap.get(key) - 1);
  }
}
