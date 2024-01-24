import { describe, expect, it } from 'vitest';

import Changeset from './Changeset';
import Strips from './Strips';
import {
  createMockStrips,
  getMockStripValues,
  getMockStripValue,
} from './tests/helpers/strips';

describe('Changeset', () => {
  describe('static', () => {
    it('serializes as [l0,l1,[...strips]]', () => {
      expect(
        new Changeset({
          requiredLength: 2,
          length: 4,
          strips: Strips.deserialize('ab'),
        }).serialize()
      ).toStrictEqual([2, 4, ['ab']]);
    });
  });

  describe('slice', () => {
    it.each([
      [
        'returns last three characters from negative index',
        ['abc', 'de'],
        [-3, -1],
        ['c', 'de'],
      ],
    ])('%s: %s.slice(%s) = %s', (_msg, strs, [sliceStart, sliceEnd], expected) => {
      const changeset = new Changeset({
        strips: createMockStrips(strs),
      });

      expect(getMockStripValues(changeset.slice(sliceStart, sliceEnd))).toStrictEqual(
        expected
      );
    });
  });

  describe('at', () => {
    it.each([
      ['returns last character', ['abc', 'de'], -1, 'e'],
      ['returns undefined for out of bounds index', ['de'], 10, undefined],
    ])('%s: %s.at(%s) = %s', (_msg, strs, index, expected) => {
      const changeset = new Changeset({
        strips: createMockStrips(strs),
      });

      const strip = getMockStripValue(changeset.at(index));
      if (expected !== undefined) {
        expect(strip).toStrictEqual(expected);
      } else {
        expect(strip).toBeUndefined();
      }
    });
  });
});
