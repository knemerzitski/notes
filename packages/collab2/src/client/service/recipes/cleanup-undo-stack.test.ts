import { castDraft, produce, WritableDraft } from 'immer';
import { expect, it } from 'vitest';

import { Changeset } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import {
  HistoryServiceRecord,
  ServerHistoryServiceRecord,
  ViewHistoryServiceRecord,
} from '../types';
import { transformPartialProperties } from '../utils/partial-properties';

import { cleanupUndoStack } from './cleanup-undo-stack';


function s(revision: number): WritableDraft<ServerHistoryServiceRecord> {
  return {
    type: 'server',
    revision,
  };
}

function v(viewIndex: number): WritableDraft<ViewHistoryServiceRecord> {
  return {
    type: 'view',
    viewIndex,
    externalChanges: [],
    changeset: castDraft(Changeset.EMPTY),
    inverse: castDraft(Changeset.EMPTY),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
  };
}

function extractIndexes(stack: readonly HistoryServiceRecord[]) {
  return stack.map((r) => (r.type === 'server' ? r.revision : r.viewIndex));
}

it('cleans up single record', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 0,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [v(1)];
    draft.undoStackTypeServerIndexes = [];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([]);
});

it('cleans up to limit', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 1,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [v(1), v(2), v(3)];
    draft.undoStackTypeServerIndexes = [];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([3]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([]);
});

it('cleans up single record after first server type', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 0,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [s(0), v(1)];
    draft.undoStackTypeServerIndexes = [0];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([0]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([0]);
});

it('cleans up between server types ending with server type', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 0,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [s(0), v(1), v(2), s(3), v(4), s(5)];
    draft.undoStackTypeServerIndexes = [0, 3, 5];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([0, 3, 5]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([0, 1, 2]);
});

it('cleans up between server types ending with view type', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 0,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [s(0), v(1), v(2), s(3), v(4), v(5)];
    draft.undoStackTypeServerIndexes = [0, 3];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([0, 3]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([0, 1]);
});

it('cleans up to limit between server types', () => {
  const props = transformPartialProperties({
    context: {
      arrayCleanupThreshold: 0,
      historySizeLimit: 3,
    },
  });
  let state = props.state.state;

  state = produce(state, (draft) => {
    draft.undoStack = [s(0), v(1), v(2), s(3), v(4), v(5)];
    draft.undoStackTypeServerIndexes = [0, 3];
  });
  state = produce(state, cleanupUndoStack(props));

  expect(extractIndexes(state.undoStack)).toStrictEqual([0, 2, 3, 4, 5]);
  expect(state.undoStackTypeServerIndexes).toStrictEqual([0, 2]);
});
