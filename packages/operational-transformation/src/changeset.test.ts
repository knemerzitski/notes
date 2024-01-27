import { describe, expect, it } from 'vitest';

import { IDENTITY } from './changeset';
import { toChangeset } from './tests/helpers/convert';

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
      [
        'basil, below (baseball)',
        [[0, 1], 'si', 7],
        [0, 'e', [2, 3], 'ow'],
        [0, 'esiow'],
      ],
      [
        'below, basil  (baseball)',
        [0, 'e', 6, 'ow'],
        [[0, 1], 'si', [3, 4]],
        [0, 'esiow'],
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
        'basil, below (baseball)',
        [[0, 1], 'si', 7],
        [0, 'e', 6, 'ow'],
        [0, 'e', [2, 3], 'ow'],
      ],
      [
        'below, basil (baseball)',
        [0, 'e', 6, 'ow'],
        [[0, 1], 'si', 7],
        [[0, 1], 'si', [3, 4]],
      ],
      [
        'insert between followed by insert at end',
        [[0, 10], 'between', [11, 23]],
        [[0, 23], 'end'],
        [[0, 30], 'end'],
      ],
      [
        'insert at end followed by insert between',
        [[0, 23], 'end'],
        [[0, 10], 'between', [11, 23]],
        [[0, 10], 'between', [11, 26]],
      ],
      [
        'insert at the same position with same text',
        [[0, 6], 'fast', [7, 12]],
        [[0, 6], 'fast', [7, 12]],
        [[0, 10], 'fast', [11, 16]],
      ],
    ])('%s: %s.follow(%s) = %s', (_msg, changeObjA, changeObjB, expectedfAB) => {
      const A = toChangeset(changeObjA);
      const B = toChangeset(changeObjB);
      const fAB = A.follow(B);
      expect(fAB.strips).toStrictEqual(toChangeset(expectedfAB).strips);
    });
  });

  describe('follow with compose document', () => {
    it.each([
      {
        msg: 'inserts at two separate lines',
        initial: 'first line:\nsecond line:',
        changeA: [[0, 10], ' first insert', [11, 23]], // A insert between
        changeB: [[0, 23], ' second insert'], // B insert end
        expectedXA: 'first line: first insert\nsecond line:',
        expectedXB: 'first line:\nsecond line: second insert',
        expectedResult: 'first line: first insert\nsecond line: second insert',
      },
      {
        msg: 'insert same text at the same position',
        initial: 'insert here:!!!',
        changeA: [[0, 11], 'fast', [12, 14]], // A insert between
        changeB: [[0, 11], 'best', [12, 14]], // B insert end
        expectedXA: 'insert here:fast!!!',
        expectedXB: 'insert here:best!!!',
        expectedResult: 'insert here:bestfast!!!',
      },
      {
        msg: 'insert same text at the same position reverse',
        initial: 'insert here:!!!',
        changeA: [[0, 11], 'best', [12, 14]], // A insert between
        changeB: [[0, 11], 'fast', [12, 14]], // B insert end
        expectedXA: 'insert here:best!!!',
        expectedXB: 'insert here:fast!!!',
        expectedResult: 'insert here:bestfast!!!', // bestfast same as above, so follow is commutative
      },
    ])('%s', ({ initial, changeA, changeB, expectedXA, expectedXB, expectedResult }) => {
      const X = toChangeset([initial]);
      const A = toChangeset(changeA);
      const B = toChangeset(changeB);
      const XA = X.compose(A);
      const XB = X.compose(B);
      expect(XA).toStrictEqual(toChangeset([expectedXA]));
      expect(XB).toStrictEqual(toChangeset([expectedXB]));

      const fAB = A.follow(B);
      const fBA = B.follow(A);
      const AfAB = A.compose(fAB);
      const BfBA = B.compose(fBA);
      expect(AfAB, 'follow is not commutative').toStrictEqual(BfBA);

      const XAfAB = XA.compose(fAB);
      const XBfBA = XB.compose(fBA);

      expect(XAfAB).toStrictEqual(toChangeset([expectedResult]));
      expect(XAfAB).toStrictEqual(XBfBA);
    });
  });

  describe('Identity', () => {
    it('compose passes through', () => {
      const changeset = toChangeset([[1, 2], 'abc', 3]);
      expect(IDENTITY.compose(changeset)).toStrictEqual(changeset);
      expect(changeset.compose(IDENTITY)).toStrictEqual(changeset);
    });

    it('follow passes through', () => {
      const changeset = toChangeset([[1, 2], 'abc', 3]);
      expect(IDENTITY.follow(changeset)).toStrictEqual(changeset);
      expect(changeset.follow(IDENTITY)).toStrictEqual(changeset);
    });
  });
});
