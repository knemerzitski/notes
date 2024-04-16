import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';

import { CollabServer } from './collab-server';

describe('constructor', () => {
  it('creates empty text without arguments', () => {
    const docServer = new CollabServer();
    expect(docServer.headText.revision).toStrictEqual(-1);
    expect(docServer.headText.changeset.serialize()).toStrictEqual([]);

    docServer.addChange({
      revision: -1,
      changeset: Changeset.fromInsertion('first'),
    });
    expect(docServer.headText.revision).toStrictEqual(0);
    expect(docServer.headText.changeset.serialize()).toStrictEqual(['first']);
  });
});

describe('add', () => {
  let docServer: CollabServer;

  beforeEach(() => {
    const records = [
      {
        revision: 5,
        changeset: Changeset.fromInsertion('start'),
      },
      {
        revision: 6,
        changeset: Changeset.parseValue([[0, 4], ' end']),
      },
      {
        revision: 7,
        changeset: Changeset.parseValue([[0, 4], ' between (parenthesis) ', [6, 8]]),
      },
    ];

    // (0 -> 31)["start between (parenthesis) end"]
    const composedChangeset = records.reduce(
      (a, b) => a.compose(b.changeset),
      Changeset.EMPTY
    );

    docServer = new CollabServer({
      headText: {
        revision: 7,
        changeset: composedChangeset,
      },
      records,
    });
  });

  it('returns last record', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };
    const returnedRecord = docServer.addChange(change);
    expect(docServer.records[docServer.records.length - 1]).toStrictEqual(returnedRecord);
  });

  it('adds change for latest revision', () => {
    const change = {
      revision: 7,
      changeset: Changeset.parseValue([[0, 4], ' [', [15, 25], ']']),
    };

    const returnedRecord = docServer.addChange(change);
    expect(returnedRecord.revision).toStrictEqual(8);
    expect(returnedRecord.changeset.serialize()).toStrictEqual([
      [0, 4],
      ' [',
      [15, 25],
      ']',
    ]);

    expect(docServer.headText.revision).toStrictEqual(8);
    expect(docServer.headText.changeset.serialize()).toStrictEqual([
      'start [parenthesis]',
    ]);
  });

  it('adds change for older revision', () => {
    const change = {
      revision: 6,
      changeset: Changeset.parseValue([[0, 4], '[at the same time as end was inserted]']),
    };

    const returnedRecord = docServer.addChange(change);
    expect(returnedRecord.revision).toStrictEqual(8);
    expect(returnedRecord.changeset.serialize()).toStrictEqual([
      [0, 27],
      '[at the same time as end was inserted]',
    ]);

    expect(docServer.headText.revision).toStrictEqual(8);
    expect(docServer.headText.changeset.serialize()).toStrictEqual([
      'start between (parenthesis) [at the same time as end was inserted]',
    ]);
  });

  it('throws error if adding change that requires older records that are not available', () => {
    const change = {
      revision: 3,
      changeset: Changeset.EMPTY,
    };

    expect(() => docServer.addChange(change)).toThrow();
  });

  it('throws error if adding change that requires future revisions', () => {
    const change = {
      revision: 8,
      changeset: Changeset.EMPTY,
    };

    expect(() => docServer.addChange(change)).toThrow();
  });
});
