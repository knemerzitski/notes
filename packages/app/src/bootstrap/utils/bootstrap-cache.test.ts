import { describe, it, expect } from 'vitest';

import { ColorMode } from '../../__generated__/graphql';

import { BootstrapCache } from './bootstrap-cache';

class MapStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  constructor(public readonly map: Map<string, string>) {}

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }
}

function init(data: string) {
  const storage = new MapStorage(new Map<string, string>([['boot', data]]));
  const cache = new BootstrapCache({
    key: 'boot',
    storage,
  });
  return { storage, cache };
}

describe('recover from invalid data', () => {
  it.each(['false', '"foo"', 'mess'])('%s', (data) => {
    const { storage, cache } = init(data);

    cache.persist();

    expect(JSON.parse(storage.map.get('boot') ?? '')).toStrictEqual(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        colorMode: expect.any(String),
      })
    );
  });
});

describe('recover from invalid colorMode', () => {
  it.each(['{"colorMode":"s"}', '{"colorModer":"s"}', '{"colorModer":52}'])(
    '%s',
    (data) => {
      const { storage, cache } = init(data);

      cache.set('colorMode', ColorMode.LIGHT);
      expect(JSON.parse(storage.map.get('boot') ?? '')).toStrictEqual(
        expect.objectContaining({ colorMode: ColorMode.LIGHT })
      );
    }
  );
});
