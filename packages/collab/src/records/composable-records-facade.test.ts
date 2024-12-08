import { describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';

import { BaseComposableRecord, ComposableRecordsFacade } from './composable-records-facade';
import { TextMemoRecords } from './text-memo-records';

function cs(value: unknown): Changeset {
  return Changeset.parseValue(value);
}

function r(value: unknown): BaseComposableRecord {
  return {
    changeset: cs(value),
  };
}
function rs(values: unknown[]): BaseComposableRecord[] {
  return values.map(r);
}

function expectRecords(actual: TextMemoRecords<BaseComposableRecord>, expected: unknown[]) {
  const a = actual.items.map((i) => i.changeset.toString());
  const b = expected.map((i) => cs(i).toString());
  expect(a).toStrictEqual(b);
}

function expectTailText(actual: TextMemoRecords<BaseComposableRecord>, expected: unknown[]) {
  expect(actual.tailText.toString()).toStrictEqual(cs(expected).toString());
}

describe('constructor', () => {
  it('throws error if tailText has retained characters', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs([0]),
      records: [],
    });

    expect(() => {
      new ComposableRecordsFacade(memoRecords);
    }).toThrow();
  });

  it('throws error if tailText is invalid', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs(['a']),
      records: rs([['b', 1]]),
    });

    expect(() => {
      new ComposableRecordsFacade(memoRecords);
    }).toThrow();
  });

  it('throws error if any record is invalid', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs(['a']),
      records: rs([
        [0, 'b'],
        [5, 'bad'],
      ]),
    });

    expect(() => {
      new ComposableRecordsFacade(memoRecords);
    }).toThrow();
  });
});

describe('push', () => {
  it('pushes record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    composableFacade.push(r(['b']));

    expectRecords(memoRecords, [['a'], ['b']]);
  });

  it('throws error on invalid record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.push(r(['b', 1]));
    }).toThrow();
  });
});

describe('deleteFromThenPush', () => {
  it('deletes newer and then pushes record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['c']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    composableFacade.deleteFromThenPush(1, r(['newB']));
    expectRecords(memoRecords, [['a'], ['newB']]);
  });

  it('throws error on invalid record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.deleteFromThenPush(1, r(['newB', 1]));
    }).toThrow();
  });
});

describe('splice', () => {
  it('splices records', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['c'], ['d']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    composableFacade.splice(1, 2, r(['bc']));
    expectRecords(memoRecords, [['a'], ['bc'], ['d']]);
  });

  it('throws error on invalid left record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['c'], ['d']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.splice(1, 2, ...rs([['b1', 1], ['c1'], ['y']]));
    }).toThrow();
  });

  it('throws error on invalid right record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['cd'], ['d', 1]]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.splice(1, 2, ...rs([['b1'], ['c1'], ['y']]));
    }).toThrow();
  });

  it('throws error on invalid inner record', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['cd'], ['d']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.splice(1, 2, ...rs([['b1'], ['c1', 2], ['y']]));
    }).toThrow();
  });
});

describe('tailTextAndSplice', () => {
  it('replaces tailText', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['c'], ['d']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    composableFacade.replaceTailTextAndSplice(cs(['B']), 1, 2, r(['bc']));
    expectTailText(memoRecords, ['B']);
    expectRecords(memoRecords, [['a'], ['bc'], ['d']]);
  });

  it('throws error if tailText has retained characters', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.replaceTailTextAndSplice(cs([0]), 0, 1);
    }).toThrow();
  });

  it('throws error if tailText is invalid to existing record', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs(['abc']),
      records: rs([['a', 2]]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.replaceTailTextAndSplice(cs(['a']), 1, 0);
    }).toThrow();
  });

  it('throws error if tailText is invalid to insert record', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs(['abc']),
      records: rs([['a', 2]]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.replaceTailTextAndSplice(cs(['a']), 0, 1, r([1, 'b']));
    }).toThrow();
  });
});

describe('replaceTailTExt', () => {
  it('replaces tailText', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a'], ['b'], ['c'], ['d']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    composableFacade.replaceTailText(cs(['B']));
    expectTailText(memoRecords, ['B']);
  });

  it('throws error if tailText has retained characters', () => {
    const memoRecords = new TextMemoRecords({
      records: rs([['a']]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.replaceTailText(cs([0]));
    }).toThrow();
  });

  it('throws error if tailText is invalid', () => {
    const memoRecords = new TextMemoRecords({
      tailText: cs(['abc']),
      records: rs([['a', 2]]),
    });
    const composableFacade = new ComposableRecordsFacade(memoRecords);

    expect(() => {
      composableFacade.replaceTailText(cs(['ab']));
    }).toThrow();
  });
});
