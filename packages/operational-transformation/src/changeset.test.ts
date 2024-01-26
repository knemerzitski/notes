import { describe, expect, it } from 'vitest';

import { Changeset } from './changeset';
import { toChangeset, toStrip, toStrips } from './tests/helpers/convert';

describe('Changeset', () => {
  describe('compose', () => {
    it.each([
      ['simple hello world', ['hello'], [[0, 4], ' world'], ['hello world']],
      [
        'overlaps retained characters with insertions',
        ['s', [2, 5], 'replace', 6, 'start'],
        [[0, 3], 'new', [5, 12], ' ', 13, 'ends'],
        ['s', [2, 4], 'newreplace', 6, ' sends'],
      ],
    ])('%s: %s.compose(%s) = %s', (_msg, left, right, expected) => {
      const leftChangeset = toChangeset(left);
      const rightChangeset = toChangeset(right);
      const composedChangeset = leftChangeset.compose(rightChangeset);

      expect(composedChangeset).toStrictEqual(toChangeset(expected));
    });

    it('throws error when composing changeset with length 5 to changeset which indexes 0 to 7', () => {
      const leftChangeset = toChangeset(['hello']);
      const rightChangeset = toChangeset([[0, 7], ' world']);
      expect(() => leftChangeset.compose(rightChangeset)).toThrow();
    });

    it('throws error when changeset index is completely out for range', () => {
      const leftChangeset = toChangeset(['hello']);
      const rightChangeset = toChangeset([[12, 14], ' world']);
      expect(() => leftChangeset.compose(rightChangeset)).toThrow();
    });
  });

  describe('follow', () => {
    it.each([
      [
        'returns for simple retained and insertion characters',
        [[0, 1], 'si', 7],
        [0, 'e', 6, 'ow'],
        [0, 'e', [2, 3], 'ow'],
      ],
      [
        'returns for simple retained and insertion characters reverse arguments',
        [0, 'e', 6, 'ow'],
        [[0, 1], 'si', 7],
        [[0, 1], 'si', [3, 4]],
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
      [
        'long range at beginning',
        'long ranges',
        [[0, 9], 's'],
        'aobngc',
        ['a', 1, 'b', [2, 3], 'c'],
      ],
    ])('%s', (initialText, textA, objChangeA, textB, objChangeB) => {
      const X = Changeset.from(toStrip(initialText));
      const A = new Changeset(toStrips(objChangeA));
      const B = new Changeset(toStrips(objChangeB));
      expect(X.compose(A).strips).toStrictEqual(toStrips([textA]));
      expect(X.compose(B).strips).toStrictEqual(toStrips([textB]));

      const fAB = A.follow(B);
      const fBA = B.follow(A);

      expect(X.compose(A).compose(fAB)).toStrictEqual(X.compose(B).compose(fBA));
    });
  });
});
