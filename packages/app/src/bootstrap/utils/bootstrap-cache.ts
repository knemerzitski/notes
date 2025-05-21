import {
  coerce,
  defaulted,
  enums,
  Infer,
  nullable,
  string,
  type,
  unknown,
} from 'superstruct';

import { ColorMode } from '../../__generated__/graphql';

const BootstrapCacheStruct = defaulted(
  coerce(
    type({
      colorMode: coerce(enums(Object.values(ColorMode)), unknown(), (value) => {
        if (Object.values(ColorMode).includes(value as ColorMode)) {
          return value;
        }
        return ColorMode.SYSTEM;
      }),
    }),
    nullable(string()),
    (value) => {
      if (typeof value !== 'string') {
        return {};
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedValue = JSON.parse(value);
        if (typeof parsedValue !== 'object') {
          return {};
        }
        return parsedValue;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        return {};
      }
    },
    (value) => JSON.stringify(value)
  ),
  () => ({})
);

type CacheShape = Infer<typeof BootstrapCacheStruct>;
type CacheKey = keyof CacheShape;

/**
 * This cache is used until Apollo Cache is restored.
 */
export class BootstrapCache {
  private readonly key;
  private readonly storage;

  constructor({
    key,
    storage,
  }: {
    key: string;
    storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  }) {
    this.key = key;
    this.storage = storage;
  }

  set<TKey extends CacheKey>(key: TKey, value: CacheShape[TKey]) {
    const data = this.read();
    data[key] = value;
    this.write(data);
  }

  get<TKey extends CacheKey>(key: TKey): CacheShape[TKey] {
    return this.read()[key];
  }

  persist() {
    this.write(this.read());
  }

  private read() {
    return BootstrapCacheStruct.create(this.storage.getItem(this.key));
  }

  private write(data: Infer<typeof BootstrapCacheStruct>) {
    const rawData = BootstrapCacheStruct.createRaw(data);
    if (rawData) {
      this.storage.setItem(this.key, rawData);
    } else {
      this.storage.removeItem(this.key);
    }
  }
}
