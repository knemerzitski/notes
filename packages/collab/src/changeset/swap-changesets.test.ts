import { it, expect } from 'vitest';

import { swapChangesets } from './swap-changesets';

import { Changeset } from '.';

/**
 * @source {@link https://stackoverflow.com/questions/9960908/permutations-in-javascript}
 */
function* permutator<T>(inputArr: T[]): Generator<T[]> {
  function* permute(arr: T[], m: T[] = []): Generator<T[]> {
    if (arr.length === 0) {
      yield m;
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        yield* permute(curr.slice(), m.concat(next));
      }
    }
  }

  yield* permute(inputArr);
}

function* generateRawStrips(head: string, insertPool: string[]): Generator<unknown[]> {
  // get all permutations of strings

  const insertStrings = new Set<string>();
   
  for (let i = 0; i < insertPool.length; i++) {
    for (const str of [...permutator(insertPool.slice(0, i + 1))].map((strList) =>
      strList.join('')
    )) {
      insertStrings.add(str);
    }
  }

  for (let i = 0; i < head.length; i++) {
    for (let j = i; j < head.length; j++) {
      for (const str of insertStrings) {
        yield [str, [i, j]];
        for (let l = str !== '' ? 0 : j - i; l < j - i; l++) {
          yield [[i, i + l], str, [i + l + 1, j]];
        }
        if (str !== '') {
          yield [[i, j], str];
        }
      }
    }
  }
}

it(
  'with generated inputs',
  {
    timeout: 30000,
  },
  () => {
    // let testCounter = 0;
    let lastInput;
    try {
      const rL0 = 'abcde';
      const L0 = Changeset.fromInsertion(rL0);
      // for (const rL1 of generateRawStrips(rL0, ['', 'A', 'BC'])) {
      for (const rL1 of generateRawStrips(rL0, ['BC'])) {
        const L1 = Changeset.parseValue(rL1);
        const L0L1 = L0.compose(L1);
        const rL0L1 = L0L1.joinInsertions();
        // for (const rL2 of generateRawStrips(rL0L1, ['', 'XYZ', '12345', 'fffgggh'])) {
        for (const rL2 of generateRawStrips(rL0L1, ['XYZ', 'fffgggh'])) {
          // testCounter++;
          const L2 = Changeset.parseValue(rL2);

          lastInput = [L0.strips, L1, L2];

          const [L2_, L1_] = swapChangesets(L0.length, L1, L2);

          expect(L0.compose(L1).compose(L2).toString()).toStrictEqual(
            L0.compose(L2_).compose(L1_).toString()
          );
        }
      }
    } catch (err) {
      console.log(`Test failed with`, lastInput);
      throw err;
    } finally {
      // console.log(`Ran ${testCounter} generated tests`);
    }
  }
);

it.each([
  [[], [], []],
  [[], ['a'], []],
  [[], [], ['a']],
  // "" => "a" => "ab"
  [[], ['a'], [0, 'b']],
  // abcdefgh => cdDRefFh => dRefFhz
  [['abcdefgh'], [[2, 3], 'DR', [4, 5], 'F', 7], [1, [3, 7], 'z']],
  // abcdefgh => cdDRefFh => dRefFz
  [['abcdefgh'], [[2, 3], 'DR', [4, 5], 'F', 7], [1, [3, 6], 'z']],
  // abcdefgh => cdDRefFh => dRefz
  [['abcdefgh'], [[2, 3], 'DR', [4, 5], 'F', 7], [1, [3, 5], 'z']],
  [['abcdefghij'], [[2, 3], 'DRg', [4, 5], 'F', [7, 9]], [1, [3, 7], 'z']],
  [['abcdefghij'], [[2, 3], 'D', [4, 7], 'F', [8, 9]], [1, [3, 6], 'z', 7]],

  // copied tests from old `swapChanges`
  // hello => hello world => between worldafter
  [['hello'], [[0, 4], ' world'], ['between', [5, 10], 'after']],
  [['hello world'], [[0, 4], ' delme', [5, 10]], [[0, 5], 'replaced', [11, 16]]],
  [
    ['hello world lorem'],
    [[0, 4], ' delme', [5, 10], ' deltoo', [11, 16]],
    [[0, 5], 'replaced', [11, 17], 'gone', [24, 29]],
  ],
  [['hello between world'], [[0, 10], '[A]', [11, 18]], [[6, 21], ' END']],
  [['hello between world'], [[0, 10], '[A]', [11, 18]], ['START: ', [6, 21]]],
  [
    ['hello between world'],
    [[0, 10], '[A]', [11, 18]],
    ['START: ', [6, 15], ' W', [18, 21]],
  ],
  [
    ['hello between world'],
    [[0, 10], '[A]', [11, 18]],
    ['START: ', [6, 15], ' WO', [20, 21]],
  ],
  [
    ['[EXTERNAL][e1][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'],
    [[0, 10], '[A]', [11, 18]],
    ['START: ', [6, 15], ' WO', [20, 21]],
  ],

  [['start'], [[0, 4], ', middle'], [[0, 12], ', end']],

  // From generated tests
  [['abcde'], ['A', [0, 4]], [0]],
])('%s * %s * %s', (rL0, rL1, rL2) => {
  const L0 = Changeset.parseValue(rL0);
  const L1 = Changeset.parseValue(rL1);
  const L2 = Changeset.parseValue(rL2);

  const [L2_, L1_] = swapChangesets(L0.length, L1, L2);

  expect(L0.compose(L1).compose(L2).toString()).toStrictEqual(
    L0.compose(L2_).compose(L1_).toString()
  );
});
