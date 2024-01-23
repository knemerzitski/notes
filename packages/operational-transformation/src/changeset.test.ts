import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';
import { Changeset, Strip, Strips } from './changeset';

describe('changeset', () => {
  // Temporary mocked strip that uses string to validate indices
  type MockStrip = Strip & { value: string };
  function createMockStrip(str: string): MockStrip {
    return mock<MockStrip>({
      value: str,
      length: str.length,
      slice(start, end) {
        return createMockStrip(str.slice(start, end));
      },
    });
  }

  function createMockStrips(strs: string[]): Strips {
    return new Strips(...strs.map((str) => createMockStrip(str)));
  }

  function getMockStripValues(strips: Strips) {
    return strips.values.map((strip) => getMockStripValue(strip));
  }

  function getMockStripValue(strip: Strip | undefined) {
    return (strip as MockStrip | undefined)?.value;
  }

  describe('Strip', () => {
    describe('static', () => {
      describe('deserialize', () => {
        it('string => StringStrip', () => {
          expect(Strip.deserialize('a')).toStrictEqual(new StringStrip('a'));
        });

        it('number => IndexStrip', () => {
          expect(Strip.deserialize(5)).toStrictEqual(new IndexStrip(5));
        });

        it('[number,number] => RangeStrip', () => {
          expect(Strip.deserialize([1, 2])).toStrictEqual(new RangeStrip(1, 2));
        });

        it('throws error on invalid value', () => {
          expect(() => Strip.deserialize(true)).toThrow();
          expect(() => Strip.deserialize({})).toThrow();
        });
      });

      describe('EMPTY', () => {
        it('has length 0', () => {
          expect(Strip.EMPTY.length).toStrictEqual(0);
        });

        it('has maxIndex -1', () => {
          expect(Strip.EMPTY.maxIndex).toStrictEqual(-1);
        });

        it('returns empty reference', () => {
          expect(Strip.EMPTY.reference(mock())).toStrictEqual(Strips.EMPTY);
        });

        it('return self on slice', () => {
          expect(Strip.EMPTY.slice()).toStrictEqual(Strip.EMPTY);
        });

        it('returns provided strip on concat', () => {
          expect(Strip.EMPTY.concat(Strip.deserialize('hi'))).toStrictEqual(
            Strips.deserialize('hi')
          );
        });

        it('returns undefined on serialize', () => {
          expect(Strip.EMPTY.serialize()).toBeUndefined();
        });
      });
    });
  });

  describe('Strips', () => {
    describe('static', () => {
      it('deserializes values', () => {
        expect(Strips.deserialize(5, [2, 4], 'str')).toStrictEqual(
          new Strips(new IndexStrip(5), new RangeStrip(2, 4), new StringStrip('str'))
        );
      });

      it('EMPTY has no values', () => {
        expect(Strips.EMPTY.values).toStrictEqual([]);
      });
    });

    describe('slice', () => {
      it.each([
        ['returns empty', [], [0, 0], []],
        ['returns start of single string', ['abcdef'], [0, 2], ['ab']],
        ['returns middle of single string', ['abcdef'], [1, 4], ['bcd']],
        ['returns end of single string', ['abcdef'], [4, 6], ['ef']],
        [
          'returns start of string in array middle index',
          ['abcd', 'efghij', 'klmn'],
          [4, 8],
          ['efgh'],
        ],
        [
          'returns middle of string in array middle index',
          ['abcd', 'efghij', 'klmn'],
          [5, 8],
          ['fgh'],
        ],
        [
          'returns end of string in array middle index',
          ['abcd', 'efghij', 'klmn'],
          [6, 10],
          ['ghij'],
        ],
        [
          'returns two sliced strings when indices span across two string',
          ['ab', 'cdefg', 'hijklm', 'no'],
          [4, 9],
          ['efg', 'hi'],
        ],
        [
          'returns start/end sliced and whole inner string when indices span across multiple strings',
          ['ab', 'cd', 'ef', 'gh', 'ij'],
          [3, 7],
          ['d', 'ef', 'g'],
        ],
        [
          'returns from start if end is undefined',
          ['ab', 'cd', 'ef'],
          [3, undefined],
          ['d', 'ef'],
        ],
        [
          'returns identical without arguments',
          ['ab', 'cd', 'ef'],
          [undefined, undefined],
          ['ab', 'cd', 'ef'],
        ],
        ['returns empty for out of bounds index', ['abc', 'de'], [15, 20], []],
      ])('%s: %s.slice(%s) = %s', (_msg, strs, [sliceStart, sliceEnd], expected) => {
        expect(
          getMockStripValues(createMockStrips(strs).slice(sliceStart, sliceEnd))
        ).toStrictEqual(expected);
      });
    });

    describe('at', () => {
      it.each([[['abc', 'def'], 4, 'e']])('%s.at(%s) = %s', (strs, index, expected) => {
        const strips = createMockStrips(strs);
        expect(getMockStripValue(strips.at(index))).toStrictEqual(expected);
      });
    });

    describe('calcMaxIndex', () => {
      function createStrips(maxIndices: number[]): Strip[] {
        return maxIndices.map((maxIndex) =>
          mock<Strip>({
            maxIndex,
          })
        );
      }

      it.each([
        ['returns -1 for empty', [], -1],
        ['returns maximum', [7, 2, 4], 7],
      ])('%s: %s.calcMaxIndex() = %s', (_msg, nrs, expected) => {
        expect(new Strips(...createStrips(nrs)).calcMaxIndex()).toStrictEqual(expected);
      });
    });

    describe('calcTotalLength', () => {
      function createStrips(lengths: number[]): Strip[] {
        return lengths.map((length) =>
          mock<Strip>({
            length,
          })
        );
      }

      it.each([
        ['returns 0 for empty strip', [], 0],
        ['returns sum', [7, 2, 4], 13],
      ])('%s: %s.calcTotalLength() = %s', (_msg, nrs, expected) => {
        expect(new Strips(...createStrips(nrs)).calcTotalLength()).toStrictEqual(
          expected
        );
      });
    });

    describe('compact', () => {
      it.each([
        ['concats two strings', ['hello', ' world'], ['hello world']],
        [
          'concats continious strips of strings between indices',
          ['a', 'b', 10, 'c', 'd', 'ef'],
          ['ab', 10, 'cdef'],
        ],
        [
          'concats continious index, range and string',
          [[1, 3], 4, 5, 'ab', 'cd', 6, 7, [8, 14], 'c', 11, 12],
          [[1, 5], 'abcd', [6, 14], 'c', [11, 12]],
        ],
      ])('%s: %s.compact() = %s', (_msg, input, expected) => {
        expect(
          Strips.deserialize(...input)
            .compact()
            .serialize()
        ).toStrictEqual(expected);
      });
    });
  });

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
});
