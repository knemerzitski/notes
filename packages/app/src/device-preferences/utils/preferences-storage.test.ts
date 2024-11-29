import { describe, it, expect } from 'vitest';
import { PreferencesStorage } from './preferences-storage';
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

describe('recover from invalid data', () => {
  it.each(['{"colorMode":"s"}', '{"colorModer":"s"}', 'mess', '{"colorModer":52}'])(
    '%s',
    (data) => {
      const storage = new MapStorage(new Map<string, string>([['pref', data]]));
      const prefStorage = new PreferencesStorage({
        key: 'pref',
        storage,
      });

      prefStorage.setColorMode(ColorMode.LIGHT);
      expect(JSON.parse(storage.map.get('pref') ?? '')).toStrictEqual(
        expect.objectContaining({ colorMode: ColorMode.LIGHT })
      );
    }
  );
});
