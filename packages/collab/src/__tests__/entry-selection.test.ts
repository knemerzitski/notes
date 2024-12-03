import { expect, it } from 'vitest';

import { Changeset } from '../changeset';
import { SelectionRange } from '../client/selection-range';

interface TestOperation {
  selection: number;
  expectedSelection: number;
  changeset: Changeset;
}

interface TestEntry {
  tail: Changeset;
  execute: TestOperation;
  undo: TestOperation;
  composition: Changeset;
}

it.each<TestEntry>([
  {
    tail: Changeset.parseValue([]),
    execute: {
      selection: 3,
      expectedSelection: 7,
      changeset: Changeset.parseValue(['abc']),
    },
    undo: {
      selection: 0,
      expectedSelection: 4,
      changeset: Changeset.parseValue([]),
    },
    composition: Changeset.parseValue(['left', [0, 2]]),
  },
  {
    tail: Changeset.parseValue(['thetail']),
    execute: {
      selection: 10,
      expectedSelection: 13,
      changeset: Changeset.parseValue([[0, 6], 'abc']),
    },
    undo: {
      selection: 7,
      expectedSelection: 10,
      changeset: Changeset.parseValue([[0, 6]]),
    },
    composition: Changeset.parseValue(['333', [0, 9]]),
  },
  {
    tail: Changeset.parseValue(['thisDEL']),
    // type "start:", then delete "DEL"
    execute: {
      selection: 10,
      expectedSelection: 15,
      changeset: Changeset.parseValue(['start:', [0, 3]]), // start:this>
    },
    undo: {
      selection: 0,
      expectedSelection: 4,
      changeset: Changeset.parseValue([[6, 9], 'DEL']), // >thisDEL
    },
    composition: Changeset.parseValue(['LEFT', [0, 8], 'S', 9, 'END']), // LEFTstart:thiSs>END => LEFT>thiSsDEL>END
  },
])('%s', ({ tail, execute, undo, composition }) => {
  expect(
    tail.compose(execute.changeset).compose(undo.changeset),
    'Undo is not inverse of execute'
  ).toStrictEqual(tail);

  expect(
    SelectionRange.closestRetainedPosition(
      { start: execute.selection, end: execute.selection },
      composition
    ),
    'Execute selection is incorrect'
  ).toStrictEqual({
    start: execute.expectedSelection,
    end: execute.expectedSelection,
  });

  expect(
    SelectionRange.closestRetainedPosition(
      { start: undo.selection, end: undo.selection },
      composition
    ),
    'Undo selection is incorrect'
  ).toStrictEqual({
    start: undo.expectedSelection,
    end: undo.expectedSelection,
  });
});
