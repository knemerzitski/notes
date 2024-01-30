import { describe, expect, it } from 'vitest';

import { createChangeset } from './create-utils';

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
      ['empty', [], [], []],
      ['returns insert when composing insert', [], ['abc'], ['abc']],
      ['returns nothing when composing nothing', ['abc'], [], []],
      ['single retained character', ['abc'], [1], ['b']],
      ['retained to retained, range to single index', [[2, 6]], [2], [4]],
      ['overlap insert and retain', ['abc', [0, 4]], [[0, 7]], ['abc', [0, 4]]],
    ])('%s: %s.compose(%s) = %s', (_msg, left, right, expected) => {
      const leftChangeset = createChangeset(left);
      const rightChangeset = createChangeset(right);
      const composedChangeset = leftChangeset.compose(rightChangeset);

      expect(composedChangeset).toStrictEqual(createChangeset(expected));
    });

    it('throws error when composing changeset with length 5 to changeset which indexes 0 to 7', () => {
      const leftChangeset = createChangeset(['hello']);
      const rightChangeset = createChangeset([[0, 7], ' world']);
      expect(() => leftChangeset.compose(rightChangeset)).toThrow();
    });

    it('throws error when changeset index is completely out for range', () => {
      const leftChangeset = createChangeset(['hello']);
      const rightChangeset = createChangeset([[12, 14], ' world']);
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
      ['empty', [], [], []],
      ['left insertion to retained', ['hello world'], [], [[0, 10]]],
      [
        'left insertion to retained is offset',
        [[0, 4], 'hello world', [5, 8]],
        [],
        [[5, 15]],
      ],
      ['right insertion to insertion', [], ['hello world'], ['hello world']],
      [
        'right insertion to insertion, no offset',
        [],
        [[0, 4], 'hello world', [5, 8]],
        ['hello world'],
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
      ['retain intersection of both retain', [[0, 41]], [[33, 41]], [[33, 41]]],
      [
        'returns single retain strip from multiple retain strips',
        [
          [0, 12],
          [19, 29],
        ],
        [[0, 29]],
        [[0, 23]],
      ],
      [
        'returns strips in order',
        [[0, 11], 'best', [12, 14]],
        [[0, 11], 'fast', [12, 14]],
        [[0, 15], 'fast', [16, 18]],
      ],
      ['returns strips in order 2', [[0, 5], 'ab', [11, 17]], [[0, 17]], [[0, 14]]],
    ])('%s: %s.follow(%s) = %s', (_msg, changeObjA, changeObjB, expectedfAB) => {
      const A = createChangeset(changeObjA);
      const B = createChangeset(changeObjB);
      const fAB = A.follow(B);
      expect(fAB.strips).toStrictEqual(createChangeset(expectedfAB).strips);
    });
  });

  describe('closestIndexOfRetain', () => {
    it.each([
      [[], 0, -1],
      [[5], 0, 0],
      [['abc'], 1, -1],
      [[[0, 2], 'hello', [6, 10]], 6, 8],
      [['hello', [6, 10]], 6, 5],
      [['abc', [2, 4], 'dddsss', [8, 10]], 9, 13],
      [['aaaddd', [8, 10]], 4, 6],
    ])('%s.closestIndexOfRetain(%s) = %s', (changeset, cursor, expected) => {
      expect(createChangeset(changeset).closestIndexOfRetain(cursor)).toStrictEqual(
        expected
      );
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
      const X = createChangeset([initial]);
      const A = createChangeset(changeA);
      const B = createChangeset(changeB);
      const XA = X.compose(A);
      const XB = X.compose(B);
      expect(XA).toStrictEqual(createChangeset([expectedXA]));
      expect(XB).toStrictEqual(createChangeset([expectedXB]));

      const fAB = A.follow(B);
      const fBA = B.follow(A);
      const AfAB = A.compose(fAB);
      const BfBA = B.compose(fBA);
      expect(AfAB, 'follow is not commutative').toStrictEqual(BfBA);

      const XAfAB = XA.compose(fAB);
      const XBfBA = XB.compose(fBA);

      expect(XAfAB).toStrictEqual(createChangeset([expectedResult]));
      expect(XAfAB).toStrictEqual(XBfBA);
    });
  });

  describe('isIdentity', () => {
    it.each([
      [[], [], true],
      [[0], [], false],
      [[], ['a'], false],
      [[], [[0, 1]], false],
      [[[0, 2]], ['abc'], true],
      [[[0, 5]], ['abcdef'], true],
      [[[0, 8]], ['abc'], false],
      [[[0, 3]], ['abcdef'], false],
      [[[0, 7]], ['abc', [0, 4]], true],
      [[[0, 8]], ['abc', [0, 4]], false],
      [[[0, 4]], null, true],
      [[[3, 6]], null, false],
      [[0], null, true],
      [[], null, true],
    ])('%s.isIdentity(%s) = %s', (identityObj, changeObj, expectedIsIdentity) => {
      const I = createChangeset(identityObj);
      const change = changeObj ? createChangeset(changeObj) : undefined;
      if (change) {
        try {
          expect(change.compose(I).isEqual(change)).toStrictEqual(expectedIsIdentity);
        } catch (err) {
          if (expectedIsIdentity) {
            throw err;
          }
        }
      }
      expect(I.isIdentity(change)).toStrictEqual(expectedIsIdentity);
    });
  });

  describe('getIdentity', () => {
    it.each([[[]], [['a']], [[[0, 1]]], [['abc']], [['abcdef']], [['abc', [0, 4]]]])(
      '%s.isIdentity(%s) = %s',
      (changeObj) => {
        const changeset = createChangeset(changeObj);
        const I = changeset.getIdentity();
        expect(I.isIdentity(changeset)).toBeTruthy();
        expect(changeset.compose(I)).toStrictEqual(changeset);
        expect(I.compose(changeset)).toStrictEqual(changeset);
      }
    );
  });
});
