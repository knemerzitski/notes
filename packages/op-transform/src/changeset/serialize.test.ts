import { it, describe, expect } from 'vitest';

import { Changeset } from './changeset';
import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import {
  deserializeChangeset,
  deserializeStrip,
  deserializeStrips,
  serializeChangeset,
  serializeStrip,
  serializeStrips,
} from './serialize';
import { Strip } from './strip';
import { Strips } from './strips';

describe('serialize', () => {
  describe('Strip', () => {
    it.each([
      [[undefined], Strip.EMPTY, null],
      [[-1], Strip.EMPTY, null],
      [[3], new RetainStrip(3, 3), undefined],

      [[5, 4], Strip.EMPTY, null],
      [[-4, 3], new RetainStrip(0, 3), [0, 3]],
      [[[-4, 3]], new RetainStrip(0, 3), [0, 3]],
      [[5, 10], new RetainStrip(5, 10), [5, 10]],
      [[[5, 10]], new RetainStrip(5, 10), undefined],

      [[''], Strip.EMPTY, null],
      [['abc'], new InsertStrip('abc'), undefined],
      [['abcd'], new InsertStrip('abcd'), undefined],
    ])('%s', (givenSerialized, strip, expectedSerialized) => {
      expect(deserializeStrip(...givenSerialized)).toStrictEqual(strip);
      expect([serializeStrip(strip)]).toStrictEqual(
        expectedSerialized !== undefined ? [expectedSerialized] : givenSerialized
      );
    });
  });

  describe('Strips', () => {
    it.each([
      [[], Strips.EMPTY],
      [[null], new Strips([Strip.EMPTY])],
      [[1, 'abc'], new Strips([new RetainStrip(1, 1), new InsertStrip('abc')])],
    ])('%s', (serialized, strips) => {
      expect(deserializeStrips(serialized)).toStrictEqual(strips);
      expect(serializeStrips(strips)).toStrictEqual(serialized);
    });
  });

  describe('Changeset', () => {
    it.each([
      [[], Changeset.EMPTY, undefined],
      [[null], new Changeset([Strip.EMPTY]), undefined],
      [[null, null], new Changeset([Strip.EMPTY]), [null]],
      [
        [1, 'abc'],
        new Changeset([new RetainStrip(1, 1), new InsertStrip('abc')]),
        undefined,
      ],
    ])('%s', (serialized, changeset, expectedSerialized) => {
      expect(deserializeChangeset(serialized)).toStrictEqual(changeset);
      expect(serializeChangeset(changeset)).toStrictEqual(
        expectedSerialized ?? serialized
      );
    });
  });
});
