/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it } from 'vitest';

import { Changeset } from '../../common/changeset';
import { Selection } from '../../common/selection';
import { ServerRecord, SubmittedRecord } from '../types';

import { submittedHeadComposable } from './submitted-head-composable';

describe('changeset', () => {
  interface Record {
    revision: number;
    changeset: Changeset;
  }

  function parseRecord(value: any): Record {
    return {
      revision: value[0],
      changeset: Changeset.parse(value[1]),
    };
  }

  function recordStr(value: Omit<Record, 'inverse'>) {
    return `${value.revision}~${value.changeset.toString()}`;
  }

  function toSubmittedRecord(value: any): SubmittedRecord {
    const r = parseRecord(value);
    return {
      id: 'generated-id',
      authorId: 'A',
      targetRevision: r.revision,
      changeset: r.changeset,
      selectionInverse: Selection.ZERO,
      selection: Selection.ZERO,
    };
  }

  function parseServerRecords(value: any[], tailText?: string) {
    let text = tailText ? Changeset.fromText(tailText) : Changeset.EMPTY;
    const records: ServerRecord[] = value.map((v) => {
      const record = parseRecord(v);
      try {
        return {
          authorId: 'A',
          idempotencyId: 'random-id',
          revision: record.revision,
          changeset: record.changeset,
          inverse: Changeset.inverse(record.changeset, text),
          selectionInverse: Selection.ZERO,
          selection: Selection.ZERO,
        };
      } finally {
        text = Changeset.compose(text, record.changeset);
      }
    });
    return {
      serverRecords: records,
      headText: {
        text,
      },
    };
  }

  const parsedHeadComposable = (records: any, record: any, tailText?: string) => {
    const { headText, serverRecords } = parseServerRecords(records, tailText);
    return submittedHeadComposable(toSubmittedRecord(record), headText, serverRecords);
  };

  it('increments first ever record revision', () => {
    expect(recordStr(parsedHeadComposable([], [5, '0:"a"']))).toStrictEqual(
      recordStr(parseRecord([6, '0:"a"']))
    );
  });

  it('submits to first revision, abc => aBbc', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0:"a"'],
            [3, '1:0,"b"'],
            [4, '2:0-1,"c"'],
          ],
          [2, '1:0,"B"']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([5, '3:0,1-2,"B"'])));
  });

  it('submits to middle revision, abc => abCc', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0:"a"'],
            [3, '1:0,"b"'],
            [4, '2:0-1,"c"'],
          ],
          [3, '2:0-1,"C"']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([5, '3:0-2,"C"'])));
  });

  it('submits to newest revision, abc => abC', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0:"a"'],
            [3, '1:0,"b"'],
            [4, '2:0-1,"c"'],
          ],
          [4, '3:0-1,"C"']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([5, '3:0-1,"C"'])));
  });

  it('submits without tailRecord, abcd => Aabcd', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            // [1, ['a']],
            [2, '1:0,"b"'],
            [3, '2:0-1,"c"'],
            [4, '3:0-2,"d"'],
          ],
          [1, '1:"A",0'],
          'a'
        )
      )
    ).toStrictEqual(recordStr(parseRecord([5, '4:"A",0-3'])));
  });
});

describe('changeset and selection', () => {
  function parseRecord(value: any): Omit<ServerRecord, 'inverse'> {
    return {
      authorId: 'A',
      idempotencyId: 'generated-id',
      revision: value[0],
      selectionInverse: Selection.parse(value[1]),
      selection: Selection.parse(value[2]),
      changeset: Changeset.parse(value[3]),
    };
  }

  function recordStr(value: Omit<ServerRecord, 'inverse'>) {
    return `${value.selection.toString()},${value.revision}~${value.changeset.toString()},${value.selectionInverse.toString()}`;
  }

  function toSubmittedRecord(value: any): SubmittedRecord {
    const r = parseRecord(value);
    return {
      ...r,
      id: r.idempotencyId,
      targetRevision: r.revision,
    };
  }

  function parseServerRecords(value: any[], tailText?: string) {
    let text = tailText ? Changeset.fromText(tailText) : Changeset.EMPTY;
    const records: ServerRecord[] = value.map((v) => {
      const record = parseRecord(v);

      try {
        return {
          ...record,
          inverse: Changeset.inverse(record.changeset, text),
        };
      } finally {
        text = Changeset.compose(text, record.changeset);
      }
    });
    return {
      serverRecords: records,
      headText: {
        text,
      },
    };
  }

  const parsedHeadComposable = (records: any, record: any, tailText?: string) => {
    const { headText, serverRecords } = parseServerRecords(records, tailText);
    return submittedHeadComposable(toSubmittedRecord(record), headText, serverRecords);
  };

  it('shifts selection to right on my insert: b| => bB| ; ab| => abB|', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '1', '0:"b"'],
            [3, '0', '1', '1:"a",0'],
          ],
          [2, '1', '2', '1:0,"B"']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '2', '3', '2:0-1,"B"'])));
  });

  it('shifts selection to right on my delete: bB| => b| ; abB| => ab|', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '2', '0:"bB"'],
            [3, '0', '1', '2:"a",0-1'],
          ],
          [2, '2', '1', '2:0']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '3', '2', '3:0-1'])));
  });

  it('shifts selection to left on other delete: bB| => bBC| ; B| => BC|', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '2', '0:"bB"'],
            [3, '1', '0', '2:1'],
          ],
          [2, '2', '3', '2:0-1,"C"']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '1', '2', '1:0,"C"'])));
  });

  it('shifts selection to left on both delete: bBC| => bB| ; BC| => B|', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '3', '0:"bBC"'],
            [3, '1', '0', '3:1-2'],
          ],
          [2, '3', '2', '3:0-1']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '2', '1', '2:0'])));
  });

  it('no shift insert on left: |a => A|a ; |ab => A|ab', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '1', '0:"a"'],
            [3, '1', '2', '1:0,"b"'],
          ],
          [2, '0', '1', '1:"A",0']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '0', '1', '2:"A",0-1'])));
  });

  it('no shift insert "a" both left by ordering: |b => A|b ; |ab => A|ab', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '1', '0:"b"'],
            [3, '0', '1', '1:"a",0'],
          ],
          [2, '0', '1', '1:"A",0']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '1', '2', '2:0,"A",1'])));
  });

  it('shift insert "A" both left by ordering: |b => a|b ; A|b => Aa|b', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '1', '0:"b"'],
            [3, '0', '1', '1:"A",0'],
          ],
          [2, '0', '1', '1:"a",0']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '1', '2', '2:0,"a",1'])));
  });

  it('spaced insertion selection at end shifted to right', () => {
    expect(
      recordStr(
        parsedHeadComposable(
          [
            [2, '0', '4', '0:"abcd"'],
            [3, '2', '5', '4:0-1,"AAA",2-3'],
          ],
          [2, '1', '5', '4:0,"B",1-2,"B",3']
        )
      )
    ).toStrictEqual(recordStr(parseRecord([4, '1', '8', '7:0,"B",1-5,"B",6'])));
  });
});
