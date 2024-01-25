import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import Changeset from './Changeset';
import Strip from './Strip';
import Strips from './Strips';
import { toChangeset, toStrips } from './tests/helpers/convert';
import {
  createMockStrips,
  getMockStripValues,
  getMockStripValue,
} from './tests/helpers/strips';

describe('Changeset', () => {
  describe('constructor', () => {
    it('sets requiredLength, length, strips from args', () => {
      const strips = Strips.from(mock<Strip>());

      const changeset = new Changeset({
        requiredLength: 4,
        length: 10,
        strips,
      });
      expect(changeset.requiredLength).toStrictEqual(4);
      expect(changeset.length).toStrictEqual(10);
      expect(changeset.strips).toStrictEqual(strips);
    });

    it('sets requiredLength, length from strips if not defined', () => {
      const strips = Strips.from(
        mock<Strip>({
          length: 2,
          maxIndex: 1,
        }),
        mock<Strip>({
          length: 3,
          maxIndex: 8,
        })
      );

      const changeset = new Changeset({
        strips,
      });
      expect(changeset.requiredLength).toStrictEqual(9);
      expect(changeset.length).toStrictEqual(5);
      expect(changeset.strips).toStrictEqual(strips);
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

  describe('compose', () => {
    it.each([
      [
        'simple hello world',
        [0, 5, ['hello']],
        [5, 11, [[0, 4], ' world']],
        [0, 11, ['hello world']],
      ],
      [
        'overlaps retained characters with insertions',
        [0, 18, ['s', [2, 5], 'replace', 6, 'start']],
        [18, 19, [[0, 3], 'new', [5, 12], ' ', 13, 'ends']],
        [0, 19, ['s', [2, 4], 'newreplace', 6, ' sends']],
      ],
    ])('%s: %s.compose(%s) = %s', (_msg, left, right, expected) => {
      const leftChangeset = toChangeset(left);
      const rightChangeset = toChangeset(right);
      const composedChangeset = leftChangeset.compose(rightChangeset);

      expect(composedChangeset).toStrictEqual(toChangeset(expected));
    });
  });

  describe('follow', () => {
    it.each([
      [
        'returns for simple retained and insertion characters',
        [8, 5, [[0, 1], 'si', 7]],
        [8, 5, [0, 'e', 6, 'ow']],
        [5, 6, [0, 'e', [2, 3], 'ow']],
      ],
      [
        'returns for simple retained and insertion characters reverse arguments',
        [8, 5, [0, 'e', 6, 'ow']],
        [8, 5, [[0, 1], 'si', 7]],
        [5, 6, [[0, 1], 'si', [3, 4]]],
      ],
    ])('%s: %s.follow(%s) = %s', (_msg, objA, objB, expectedfAB) => {
      const A = toChangeset(objA);
      const B = toChangeset(objB);
      const fAB = A.follow(B);

      expect(fAB).toStrictEqual(toChangeset(expectedfAB));
    });
  });

  describe('follow is commutative with changes', () => {
    it.each([
      ['baseball', 'basil', [[0, 1], 'si', 7], 'below', [0, 'e', 6, 'ow']],
      ['hello world', 'worlds', [[6, 10], 's'], 'really', ['rea', [2, 3], 'y']],
    ])('%s', (initialText, textA, objChangeA, textB, objChangeB) => {
      const X = Changeset.fromText(initialText);
      const A = new Changeset({ strips: toStrips(objChangeA) });
      const B = new Changeset({ strips: toStrips(objChangeB) });
      expect(X.compose(A).strips).toStrictEqual(toStrips([textA]));
      expect(X.compose(B).strips).toStrictEqual(toStrips([textB]));

      const fAB = A.follow(B);
      const fBA = B.follow(A);

      expect(X.compose(A).compose(fAB)).toStrictEqual(X.compose(B).compose(fBA));
    });
  });
});
