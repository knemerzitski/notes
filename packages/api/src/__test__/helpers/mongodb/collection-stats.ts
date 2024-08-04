import mapObject from 'map-obj';
import { Collection } from 'mongodb';
import { MockInstance, vi } from 'vitest';

type CollectionReadMethod = 'aggregate' | 'find' | 'findOne';
type CollectionModifyMethod =
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'findOneAndUpdate'
  | 'findOneAndReplace'
  | 'deleteOne'
  | 'deleteMany'
  | 'findOneAndDelete'
  | 'bulkWrite';

const readMethods: CollectionReadMethod[] = ['aggregate', 'find', 'findOne'];
const modifyMethods: CollectionModifyMethod[] = [
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
  'bulkWrite',
];

class CollectionStats {
  private readonly readSpies: Record<CollectionReadMethod, MockInstance>;
  private readonly modifySpies: Record<CollectionModifyMethod, MockInstance>;

  private get spies() {
    return [...Object.values(this.readSpies), ...Object.values(this.modifySpies)];
  }

  constructor(collection: Collection) {
    this.readSpies = {} as Record<CollectionReadMethod, MockInstance>;
    for (const readMethod of readMethods) {
      const spy = vi.spyOn(collection, readMethod);
      this.readSpies[readMethod] = spy;
    }
    this.modifySpies = {} as Record<CollectionModifyMethod, MockInstance>;
    for (const modifyMethod of modifyMethods) {
      const spy = vi.spyOn(collection, modifyMethod);
      this.modifySpies[modifyMethod] = spy;
    }
  }

  getSpies(): Record<CollectionReadMethod | CollectionModifyMethod, MockInstance> {
    return {
      ...this.readSpies,
      ...this.modifySpies,
    };
  }

  mockClear() {
    for (const spy of this.spies) {
      spy.mockClear();
    }
  }

  getStats() {
    return {
      read: mapObject(this.readSpies, (key, method) => [key, method.mock.calls.length]),
      modify: mapObject(this.modifySpies, (key, method) => [
        key,
        method.mock.calls.length,
      ]),
      readCount: Object.values(this.readSpies).reduce(
        (a, b) => a + b.mock.calls.length,
        0
      ),
      modifyCount: Object.values(this.modifySpies).reduce(
        (a, b) => a + b.mock.calls.length,
        0
      ),
      readAndModifyCount: Object.values(this.spies).reduce(
        (a, b) => a + b.mock.calls.length,
        0
      ),
    };
  }
}

export class CollectionsStats<TName extends string> {
  readonly collectionStats: Record<TName, CollectionStats>;

  constructor(collections: Record<TName, Collection>) {
    this.collectionStats = mapObject(collections, (name, col) => [
      name,
      new CollectionStats(col),
    ]);
  }

  get(name: TName) {
    return this.collectionStats[name];
  }

  mockClear() {
    for (const col of Object.values<CollectionStats>(this.collectionStats)) {
      col.mockClear();
    }
  }

  allStats() {
    const stats = mapObject(this.collectionStats, (name, col) => [name, col.getStats()]);
    const values = Object.values<ReturnType<CollectionStats['getStats']>>(stats);
    return {
      ...stats,
      readCount: values.reduce((a, b) => a + b.readCount, 0),
      modifyCount: values.reduce((a, b) => a + b.modifyCount, 0),
      readAndModifyCount: values.reduce((a, b) => a + b.readAndModifyCount, 0),
    };
  }

  readAndModifyCount() {
    const stats = mapObject(this.collectionStats, (name, col) => [name, col.getStats()]);
    const values = Object.values<ReturnType<CollectionStats['getStats']>>(stats);
    return values.reduce((a, b) => a + b.readAndModifyCount, 0);
  }
}
