import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';

import { CollabClient } from './collab-client';
import { AnyEntry, CollabHistory } from './collab-history';

function createEntry(changeset: unknown, isTail?: boolean): AnyEntry {
  if (isTail) {
    return {
      isTail: true,
      execute: {
        changeset: Changeset.parseValue(changeset),
      },
    };
  } else {
    return {
      execute: {
        changeset: Changeset.parseValue(changeset),
        selection: {
          start: 0,
          end: 0,
        },
      },
      undo: {
        selection: {
          start: 0,
          end: 0,
        },
      },
    };
  }
}

describe('unshift', () => {
  it.each([
    {
      msg: 'one entry replace tail abcd => cd',
      populate: {
        tail: ['abcd'],
        entries: [[[0, 3], 'e']], // abcde
      },
      unshift: {
        newTail: ['cd'], // cd
        entries: [{ cs: ['ab', [0, 1]], tail: false }], // abcd
      },
      expected: {
        tail: ['cd'],
        head: ['abcde'],
        entries: [
          ['ab', [0, 1]],
          [[0, 3], 'e'],
        ],
      },
    },
    {
      msg: 'two tails between',
      unshift: {
        newTail: [],
        entries: [
          { cs: ['a'] },
          { cs: [0, 'b'], tail: true },
          { cs: [[0, 1], 'c'], tail: true },
          { cs: [[0, 2], 'd'] },
        ],
      },
      expected: {
        tail: ['bc'],
        head: ['abcd'],
        entries: [
          ['a', [0, 1]],
          [[0, 2], 'd'],
        ],
      },
    },
    {
      msg: 'complex entries',
      populate: {
        tail: ['abcdefgh'],
        entries: [
          ['_', [0, 7], '_'],
          [[0, 3], 'DDD', [5, 9]],
        ],
      },
      unshift: {
        newTail: ['bf'],
        entries: [
          { cs: [0, 'd', 1] },
          { cs: ['replaced'] },
          { cs: ['ab', 7, 'fh'], tail: true },
          { cs: [[0, 3], 'g', 4] },
          { cs: [[0, 1], 'c', [2, 5]], tail: true },
          { cs: [[0, 3], 'emany', [4, 6]], tail: true },
          {
            cs: [
              [0, 4],
              [9, 11],
            ],
            tail: true,
          },
        ],
      },
      expected: {
        tail: ['abcbfefh'],
        head: ['_abcDDDefgh_'],
        entries: [
          [[0, 3], 'd', [4, 7]],
          [[0, 2], 'd', [6, 8]],
          [[0, 5], 'g', 6],
          ['_', [0, 7], '_'],
          [[0, 3], 'DDD', [5, 9]],
        ],
      },
    },
  ])('creates correct tail and entries: $msg', ({ populate, unshift, expected }) => {
    const history = new CollabHistory({
      client: new CollabClient({
        server: populate?.tail ? Changeset.parseValue(populate.tail) : undefined,
      }),
    });
    if (populate?.entries) {
      history.push(populate.entries.map((cs) => createEntry(cs)));
    }

    history.unshift(
      Changeset.parseValue(unshift.newTail),
      unshift.entries.map(({ cs, tail }) => createEntry(cs, tail))
    );

    expect(history.tailText.toString()).toStrictEqual(
      Changeset.parseValue(expected.tail).toString()
    );
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual(
      expected.entries.map((r) => Changeset.parseValue(r).toString())
    );
    expect(history.getHeadText().toString()).toStrictEqual(
      Changeset.parseValue(expected.head).toString()
    );
  });
});

describe('composeOnAllEntries', () => {
  let history: CollabHistory;

  beforeEach(() => {
    history = new CollabHistory();
    history.push([
      createEntry(['cd']),
      createEntry(['ab', [0, 1]]),
      createEntry([[0, 1], '|', [2, 3]]),
      createEntry([[0, 4], 'efghijklmn']), // ab|cdefghijklmn
      createEntry(['B', [3, 5], 'GH', [9, 14]]),
      createEntry(['_', [0, 3], '_', [4, 11]]),
    ]);
  });

  it('inserts at start on middle target index', () => {
    history.composeOnAllEntries(Changeset.parseValue(['[before cd]', [0, 14]]), 3);

    expect(history.tailText.toString()).toStrictEqual('(0 -> 11)["[before cd]"]');
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual([
      '(11 -> 13)[0 - 10, "cd"]',
      '(13 -> 15)[0 - 10, "ab", 11 - 12]',
      '(15 -> 16)[0 - 12, "|", 13 - 14]',
      '(16 -> 26)[0 - 15, "efghijklmn"]',
      '(26 -> 23)["B", 0 - 10, 14 - 16, "GH", 20 - 25]',
      '(23 -> 25)["_", 0 - 14, "_", 15 - 22]',
    ]);
    expect(history.getHeadText().toString()).toStrictEqual(
      '(0 -> 25)["_B[before cd]cde_GHijklmn"]'
    );
  });

  it('deletes middle on middle target index', () => {
    history.composeOnAllEntries(Changeset.parseValue(['[del ij]', [0, 8], [11, 14]]), 3);

    expect(history.tailText.toString()).toStrictEqual('(0 -> 8)["[del ij]"]');
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual([
      '(8 -> 10)[0 - 7, "cd"]',
      '(10 -> 12)[0 - 7, "ab", 8 - 9]',
      '(12 -> 13)[0 - 9, "|", 10 - 11]',
      '(13 -> 21)[0 - 12, "efghklmn"]',
      '(21 -> 18)["B", 0 - 7, 11 - 13, "GH", 17 - 20]',
      '(18 -> 20)["_", 0 - 11, "_", 12 - 17]',
    ]);
    expect(history.getHeadText().toString()).toStrictEqual(
      '(0 -> 20)["_B[del ij]cde_GHklmn"]'
    );
  });

  it('removes an entry that is no longer meaningful', () => {
    history.composeOnAllEntries(Changeset.parseValue([[2, 3]]), 1); // remove "ab", keep "cd" on entry 1

    expect(history.tailText.toString()).toStrictEqual('(0 -> 0)[]');
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual([
      '(0 -> 2)["cd"]',
      '(2 -> 3)["|", 0 - 1]',
      '(3 -> 13)[0 - 2, "efghijklmn"]',
      '(13 -> 12)["B", 1 - 3, "GH", 7 - 12]',
      '(12 -> 14)["_", 0 - 3, "_", 4 - 11]',
    ]);
    expect(history.getHeadText().toString()).toStrictEqual('(0 -> 14)["_Bcde_GHijklmn"]');
  });

  it('removes all older entries, keeping only what was already removed', () => {
    history.composeOnAllEntries(Changeset.parseValue([]), 4); // from entry 4, delete everything

    expect(history.tailText.toString()).toStrictEqual('(0 -> 0)[]');
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual([
      '(0 -> 2)["ab"]',
      '(2 -> 3)[0 - 1, "|"]',
      '(3 -> 6)[0 - 2, "fgh"]',
      '(0 -> 0)[]',
      '(0 -> 2)["__"]',
    ]);
    expect(history.getHeadText().toString()).toStrictEqual('(0 -> 2)["__"]');
  });

  it('replaces tailText', () => {
    history.composeOnAllEntries(
      Changeset.parseValue([[0, 4], 'start', [5, 9]]),
      Changeset.parseValue(['[new start bla]'])
    );

    expect(history.tailText.toString()).toStrictEqual('(0 -> 15)["[new start bla]"]');
    expect(history.entries.map((e) => e.execute.changeset.toString())).toStrictEqual([
      '(10 -> 7)["cd", 5 - 9]',
      '(7 -> 9)["ab", 0 - 6]',
      '(9 -> 10)[0 - 1, "|", 2 - 8]',
      '(10 -> 20)[0 - 4, "efghijklmn", 5 - 9]',
      '(20 -> 17)["B", 3 - 5, "GH", 9 - 19]',
      '(17 -> 19)["_", 0 - 3, "_", 4 - 16]',
    ]);
    expect(history.getHeadText().toString()).toStrictEqual(
      '(0 -> 19)["_Bcde_GHijklmnstart"]'
    );
  });
});
