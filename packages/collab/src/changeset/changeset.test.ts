import { describe, expect, it, vi } from 'vitest';

import { Changeset, InsertStrip, RetainStrip, Strip, Strips } from '.';

const cs = Changeset.parseValue;

describe('compose', () => {
  it.each([
    ['simple hello world', ['hello'], [[0, 4], ' world'], ['hello world']],
    [
      'overlaps retained characters with insertions',
      ['s', [2, 5], 'replace', 6, 'start'],
      [[0, 3], 'new', [5, 12], ' ', 13, 'ends'],
      ['s', [2, 4], 'newreplace', 6, ' sends'],
    ],
    ['basil, below (baseball)', [[0, 1], 'si', 7], [0, 'e', [2, 3], 'ow'], [0, 'esiow']],
    ['below, basil  (baseball)', [0, 'e', 6, 'ow'], [[0, 1], 'si', [3, 4]], [0, 'esiow']],
    ['empty', [], [], []],
    ['returns insert when composing insert', [], ['abc'], ['abc']],
    ['returns nothing when composing nothing', ['abc'], [], []],
    ['single retained character', ['abc'], [1], ['b']],
    ['retained to retained, range to single index', [[2, 6]], [2], [4]],
    ['overlap insert and retain', ['abc', [0, 4]], [[0, 7]], ['abc', [0, 4]]],
  ])('%s', (_msg, left, right, expected) => {
    const leftChangeset = cs(left);
    const rightChangeset = cs(right);
    const composedChangeset = leftChangeset.compose(rightChangeset);

    expect(composedChangeset.toString()).toStrictEqual(cs(expected).toString());
  });

  it.each([
    [[], [0]],
    [['a'], [1]],
    [['hello'], [[0, 7], ' world']],
    [['hello'], [[12, 14], ' world']],
  ])('unable to compose: %s * %s', (left, right) => {
    const leftChangeset = cs(left);
    const rightChangeset = cs(right);
    expect(() => leftChangeset.compose(rightChangeset)).toThrow();
  });
});

describe('follow', () => {
  it.each([
    ['ignores empty', ['dd', null], [null, 'abc', null], ['abc', [0, 1]]],
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
  ])('%s', (_msg, changeObjA, changeObjB, expectedfAB) => {
    const A = cs(changeObjA);
    const B = cs(changeObjB);
    const fAB = A.follow(B);
    expect(fAB.toString()).toStrictEqual(cs(expectedfAB).toString());
  });
});

describe('merge', () => {
  it('calls follow, then compose and returns the value', () => {
    const a = cs([[1, 5], 'any']);
    const b = cs(['st', [8, 10]]);

    const followReturn = cs(['follow ret']);
    const composeReturn = cs(['compose ret']);

    const follow = vi.spyOn(a, 'follow');
    follow.mockReturnValueOnce(followReturn);

    const compose = vi.spyOn(a, 'compose');
    compose.mockReturnValueOnce(composeReturn);

    const result = a.merge(b);

    expect(follow).toHaveBeenCalledWith(b);
    expect(follow).toHaveReturnedWith(followReturn);
    expect(compose).toHaveBeenCalledWith(followReturn);
    expect(result).toStrictEqual(composeReturn);
  });
});

describe('inverse', () => {
  it.each([
    [
      'change completely overwrites and is smaller than previous text',
      ['between END! Deleted [B]'],
      ['rewrote everything'],
    ],
    [
      'change completely overwrites and is larger than',
      ['rewrote everything'],
      ['between END! Deleted [B]'],
    ],
    ['replace at beginning', ['hello world'], ['new', [5, 10]]],
    [
      'delete in middle',
      ['start between end'],
      [
        [0, 4],
        [13, 16],
      ],
    ],
    [
      'delete start, replace middle, insert end',
      ['start between world'],
      ['other', [13, 18], ' end'],
    ],
    ['multiple strips', ['abcdefghi'], ['x', 0, 'y', 1, 3, 'z', [4, 6], 'u', 7]],

    ['delete start, insert end', ['hello between world'], [[6, 18], ' end']],
    ['delete end', ['START hello between world END'], [[0, 24]]],
  ])('%s', (_msg, docObj, changeObj) => {
    const doc = cs(docObj);
    const change = cs(changeObj);
    const docWithChange = doc.compose(change);
    const inverseChange = change.inverse(doc);
    expect(docWithChange.compose(inverseChange).toString()).toStrictEqual(doc.toString());
  });
});

describe('indexOfClosestRetained', () => {
  describe('random', () => {
    it.each([
      ['empty', [], 0, 0],
      ['single retain', [5], 0, 0],
      ['random 1', [[0, 2], 'hello', [6, 10]], 6, 8],
      ['random 2', ['hello', [6, 10]], 6, 5],
      ['random 3', ['abc', [2, 4], 'dddsss', [8, 10]], 9, 13],
      ['random 4', ['aaaddd', [8, 10]], 4, 6],
      ['random 5', [[0, 16], ' end'], 6, 6],
      ['random 6', ['start ', [0, 14]], 15, 21],
      ['random 7', [[0, 20], 'THREE'], 21, 21],
    ])('%s', (_msg, changeset, cursor, expectedCursor) => {
      expect(cs(changeset).indexOfClosestRetained(cursor)).toStrictEqual(expectedCursor);
    });
  });

  describe('moves cursor closest to retained in insertion', () => {
    it.each([
      [['a'], 0, 0],
      [['a'], 1, 1],
      [['ab'], 0, 0],
      [['ab'], 1, 2],
      [['ab'], 2, 2],
      [['abc'], 0, 0],
      [['abc'], 1, 0],
      [['abc'], 2, 3],
      [['abc'], 3, 3],
      [['abcd'], 0, 0],
      [['abcd'], 1, 0],
      [['abcd'], 2, 4],
      [['abcd'], 3, 4],
      [['abcd'], 4, 4],
    ])('(%s,%s) => %s', (changeset, cursor, expectedCursor) => {
      expect(cs(changeset).indexOfClosestRetained(cursor)).toStrictEqual(expectedCursor);
    });
  });

  describe('structured', () => {
    describe('insert start +++*********', () => {
      const changeset = cs(['+++', [0, 8]]);
      it.each([
        ['^***** ****  => +++^***** ****', 0, 3],
        [' *****^****  => +++ *****^****', 5, 8],
        [' ***** ****^ => +++ ***** ****^', 9, 12],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
    describe('insert middle ****+++*****', () => {
      const changeset = cs([[0, 4], '+++', [5, 8]]);
      it.each([
        ['^***** ****  => ^***** +++ ****', 0, 0],
        [' *****^****  =>  *****^+++ ****', 5, 5],
        [' ******^***  =>  ***** +++*^***', 6, 9],
        [' ***** ****^ =>  ***** +++ ****^', 9, 12],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
    describe('insert end, *********+++', () => {
      const changeset = cs([[0, 8], '+++']);
      it.each([
        ['^***** ****  => ^***** **** +++', 0, 0],
        [' *****^****  =>  *****^**** +++', 5, 5],
        [' ***** ****^ =>  ***** ****^+++', 9, 9],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
    describe('insert start, delete start +++----*****', () => {
      const changeset = cs(['+++', [4, 8]]);
      it.each([
        ['^** *** ****  => +++----^* ****', 0, 3],
        [' **^*** ****  => +++----^* ****', 2, 3],
        [' ** ***^****  => +++---- *^****', 5, 4],
        [' ** *** ****^ => +++---- * ****^', 9, 8],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
    describe('insert middle, delete middle **--+++--***', () => {
      const changeset = cs([[0, 1], '+++', [6, 8]]);
      it.each([
        ['^** *** ****  => ^**-- +++-- ***', 0, 0],
        [' **^*** ****  =>  **--^+++-- ***', 2, 2],
        [' ** ***^****  =>  **-- +++--^***', 5, 5],
        [' ** *** ****^ =>  **-- +++-- ***^', 9, 8],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
    describe('insert end, delete end *****----+++', () => {
      const changeset = cs([[0, 4], '+++']);
      it.each([
        ['^** *** ****  => ^** ***---- +++', 0, 0],
        [' **^*** ****  =>  **^***---- +++', 2, 2],
        [' ** ***^****  =>  ** ***----^+++', 5, 5],
        [' ** *** ****^ =>  ** ***---- +++^', 9, 8],
      ])('%s, before: %s, after: %s', (_msg, beforeCursor, expectedAfterCursor) => {
        expect(changeset.indexOfClosestRetained(beforeCursor)).toStrictEqual(
          expectedAfterCursor
        );
      });
    });
  });
});

describe('insertionsToRetained', () => {
  it.each([
    [
      'retains exact insertion match into single retained range',
      ['hello insert world'],
      [[0, 5], 'insert', [12, 17]],
      [[0, 17]],
    ],
    [
      'it keeps different insertions as is',
      ['hello insert world'],
      [[0, 5], 'inserted', [12, 17]],
      [[0, 5], 'inserted', [12, 17]],
    ],
    ['retains insertion at start', ['hello insert world'], ['hello', [5, 17]], [[0, 17]]],
    ['retains insertion at end', ['hello insert world'], [[0, 12], 'world'], [[0, 17]]],
    [
      'retains insertion surrounded with deletion',
      ['hello del inserted delete world'],
      [[0, 5], 'inserted', [25, 30]],
      [
        [0, 5],
        [10, 17],
        [25, 30],
      ],
    ],
    [
      'offsets retained in text for insertions',
      ['hello ', [0, 2], ' inserted delete world'],
      [[0, 5], 'inserted', [25, 30]],
      [
        [0, 5],
        [10, 17],
        [25, 30],
      ],
    ],
    [
      'handles completely new insertion',
      ['insert here:!'],
      [[0, 11], 'value', 12],
      [[0, 11], 'value', 12],
    ],
    ['insertion at beginning', ['mobile:\n\ndesktop:'], ['\n', [0, 16]], ['\n', [0, 16]]],
  ])('%s', (_msg, docObj, changeObj, expectedObj) => {
    const doc = cs(docObj);
    const change = cs(changeObj);
    const expected = cs(expectedObj);
    const result = doc.insertionsToRetained(change);

    expect(result.toString()).toStrictEqual(expected.toString());
    expect(doc.compose(change).toString()).toStrictEqual(doc.compose(result).toString());
  });
});

describe('merge = follow with compose text', () => {
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
    const X = cs([initial]);
    const A = cs(changeA);
    const B = cs(changeB);
    const XA = X.compose(A);
    const XB = X.compose(B);
    expect(XA.toString()).toStrictEqual(cs([expectedXA]).toString());
    expect(XB.toString()).toStrictEqual(cs([expectedXB]).toString());

    const fAB = A.follow(B);
    const fBA = B.follow(A);
    const AfAB = A.compose(fAB);
    const BfBA = B.compose(fBA);
    expect(AfAB.toString(), 'merge is not commutative').toStrictEqual(BfBA.toString());

    const XAfAB = XA.compose(fAB);
    const XBfBA = XB.compose(fBA);

    expect(XAfAB.toString()).toStrictEqual(cs([expectedResult]).toString());
    expect(XAfAB.toString()).toStrictEqual(XBfBA.toString());
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
  ])('(%s, %s) = %s', (identityObj, changeObj, expectedIsIdentity) => {
    const I = cs(identityObj);
    const change = changeObj ? cs(changeObj) : undefined;
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
    '%s',
    (changeObj) => {
      const changeset = cs(changeObj);
      const I = changeset.getIdentity();
      expect(I.isIdentity(changeset)).toBeTruthy();
      expect(changeset.compose(I).toString()).toStrictEqual(changeset.toString());
      expect(I.compose(changeset).toString()).toStrictEqual(changeset.toString());
    }
  );
});

describe('toString', () => {
  it('uses strips maxIndex, length and toString', () => {
    const strips = Object.assign(new Strips(), {
      maxIndex: 89,
      length: 55,
    });
    vi.spyOn(strips, 'toString').mockReturnValueOnce('anything');

    const changeset = new Changeset(strips);

    expect(changeset.toString()).toStrictEqual('(90 -> 55)anything');
  });

  it('uses strips maxIndex, length and toString (different values)', () => {
    const strips = Object.assign(new Strips(), {
      maxIndex: 3,
      length: -4,
    });
    vi.spyOn(strips, 'toString').mockReturnValueOnce('[[aaa');

    const changeset = new Changeset(strips);

    expect(changeset.toString()).toStrictEqual('(4 -> -4)[[aaa');
  });
});

describe('serialize/parseValue', () => {
  it.each([
    [[], Changeset.EMPTY, undefined],
    [[null], new Changeset([Strip.EMPTY]), []],
    [[null, null], new Changeset([Strip.EMPTY]), []],
    [
      [1, 'abc'],
      new Changeset([new RetainStrip(1, 1), new InsertStrip('abc')]),
      undefined,
    ],
  ])('%s', (serialized, changeset, expectedSerialized) => {
    expect(Changeset.parseValue(serialized)).toStrictEqual(changeset);
    expect(changeset.serialize()).toStrictEqual(expectedSerialized ?? serialized);
  });
});
