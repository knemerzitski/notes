import { describe, it, expect } from 'vitest';
import { BootstrapCache } from './bootstrap-cache';
import { ColorMode } from '../../__generated__/graphql';

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
        colorMode: expect.any(String),
        apolloCacheVersion: expect.any(String),
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

describe('recover from invalid data apolloCacheVersion', () => {
  it.each(['{"apolloCacheVersion":false}'])('%s', (data) => {
    const { storage, cache } = init(data);

    cache.set('apolloCacheVersion', '2');
    expect(JSON.parse(storage.map.get('boot') ?? '')).toStrictEqual(
      expect.objectContaining({ apolloCacheVersion: '2' })
    );
  });
});

it('apolloCacheVersion defaults to 0', () => {
  const { storage, cache } = init('');

  cache.set('colorMode', ColorMode.DARK);
  expect(JSON.parse(storage.map.get('boot') ?? '')).toStrictEqual({
    colorMode: 'DARK',
    apolloCacheVersion: '0',
  });
});
