import { castDraft, WritableDraft } from 'immer';

import { PartialBy } from '../../../../../utils/src/types';

import { Changeset } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import { followChangesetSelection } from '../../../common/utils/follow-changeset-selection';

import { HistoryServiceRecord, LocalServiceRecord, State } from '../types';
import { castNormal } from '../utils/cast-normal';
import { getLastHistoryRecord } from '../utils/history-record';

import { updateLocalRecord } from './update-local-record';

const MERGE_INSERT_BIAS = false;

type AddLocalTypingRecord = PartialBy<LocalServiceRecord, 'selectionInverse'> & {
  /**
   * How is typing handled by history.
   * - `yes` - Change is added to history stack and can be undone
   * - `merge` - Change is merged with previous local typing if it exists
   * - `no` - Change will not be part of history stack
   * @default 'yes'
   */
  readonly history?: 'yes' | 'merge' | 'no';
};

const historyMapper: Record<
  NonNullable<AddLocalTypingRecord['history']>,
  (localRecord: AddLocalTypingRecord, draft: WritableDraft<State>) => void
> = {
  yes: history_yes,
  merge: history_merge,
  no: history_no,
};

export function addLocalTyping(localRecord: AddLocalTypingRecord) {
  const history = localRecord.history ?? 'yes';

  return (draft: WritableDraft<State>) => {
    historyMapper[history](localRecord, draft);
  };
}

function history_yes(record: AddLocalTypingRecord, draft: WritableDraft<State>) {
  const prevRecord = getLastHistoryRecord(draft.undoStack, 'view');

  const changeset = record.changeset;
  const inverse = Changeset.inverse(record.changeset, draft.viewText);
  const selectionInverse =
    record.selectionInverse ?? prevRecord?.selection ?? Selection.ZERO;
  const selection = record.selection;

  if (!changeset.isIdentity() && !Changeset.isNoOp(changeset, inverse)) {
    draft.undoStack.push({
      type: 'view',
      viewIndex: draft.viewChanges.length + draft.viewIndexOffset,
      externalChanges: [],
      changeset: castDraft(changeset),
      inverse: castDraft(inverse),
      selectionInverse,
      selection,
    });
  }

  draft.redoStack = [];

  updateLocalRecord({
    changeset,
    selectionInverse,
    selection,
  })(draft);

  const nextViewRevision = draft.viewRevision + 1;

  draft.viewChanges.push({
    viewRevision: nextViewRevision,
    changeset: castDraft(changeset),
    inverse: castDraft(inverse),
  });
  draft.viewText = castDraft(Changeset.compose(draft.viewText, changeset));

  draft.tmpRecipeResults.localTypings.push({
    viewRevision: nextViewRevision,
    changeset: castDraft(changeset),
    selection: selection,
  });

  draft.viewRevision = nextViewRevision;
}

export function history_merge(record: AddLocalTypingRecord, draft: WritableDraft<State>) {
  const prevRecord = getLastHistoryRecord(draft.undoStack, 'view');
  if (!prevRecord) {
    history_yes(record, draft);
    return false;
  }

  const anchorRecord = getLastHistoryRecord(draft.undoStack, 'view', 1);

  const selectionInverse = record.selectionInverse ?? prevRecord.selection;

  const composableIndex = prevRecord.viewIndex - draft.viewIndexOffset;
  let baseText = draft.viewChanges
    .slice(composableIndex + 1)
    .reduceRight((a, b) => Changeset.compose(a, b.inverse), castNormal(draft.viewText));

  let followRecord: Parameters<typeof followChangesetSelection>[0] = {
    changeset: prevRecord.inverse,
    inverse: prevRecord.changeset,
    selection: prevRecord.selectionInverse,
    selectionInverse: prevRecord.selection,
  };

  for (const externalChange of prevRecord.externalChanges) {
    if (anchorRecord) {
      anchorRecord.externalChanges.push(
        castDraft(
          Changeset.follow(externalChange, followRecord.changeset, !MERGE_INSERT_BIAS)
        )
      );
    }

    baseText = Changeset.compose(baseText, externalChange);

    followRecord = followChangesetSelection(
      followRecord,
      externalChange,
      baseText,
      MERGE_INSERT_BIAS
    );
  }

  const adjustedPrevRecord = {
    changeset: followRecord.inverse,
    inverse: followRecord.changeset,
    selection: followRecord.selectionInverse,
    selectionInverse: followRecord.selection,
  };

  const mergedChangeset = Changeset.compose(
    adjustedPrevRecord.changeset,
    record.changeset
  );
  const mergedInverse = Changeset.inverse(
    mergedChangeset,
    Changeset.compose(draft.viewText, adjustedPrevRecord.inverse)
  );
  if (
    !mergedChangeset.isIdentity() &&
    !Changeset.isNoOp(mergedChangeset, mergedInverse)
  ) {
    const mergedRecord: HistoryServiceRecord = {
      type: 'view',
      viewIndex: draft.viewChanges.length + draft.viewIndexOffset,
      externalChanges: [],
      changeset: mergedChangeset,
      inverse: mergedInverse,
      selectionInverse: adjustedPrevRecord.selectionInverse,
      selection: record.selection,
    };

    draft.undoStack[draft.undoStack.length - 1] = castDraft(mergedRecord);
  } else {
    // Merged change undoes previous change, pop it from undoStack
    draft.undoStack.pop();
  }

  draft.redoStack = [];

  updateLocalRecord({
    changeset: record.changeset,
    selectionInverse,
    selection: record.selection,
  })(draft);

  const nextViewRevision = draft.viewRevision + 1;

  draft.viewChanges.push({
    viewRevision: nextViewRevision,
    changeset: castDraft(record.changeset),
    inverse: castDraft(Changeset.inverse(record.changeset, draft.viewText)),
  });
  draft.viewText = castDraft(Changeset.compose(draft.viewText, record.changeset));

  draft.tmpRecipeResults.localTypings.push({
    viewRevision: nextViewRevision,
    changeset: castDraft(record.changeset),
    selection: record.selection,
  });

  draft.viewRevision = nextViewRevision;

  return true;
}

function history_no(record: AddLocalTypingRecord, draft: WritableDraft<State>) {
  const changeset = record.changeset;
  const inverse = Changeset.inverse(record.changeset, draft.viewText);
  const selectionInverse = record.selectionInverse ?? Selection.ZERO;
  const selection = record.selection;

  updateLocalRecord({
    changeset,
    selectionInverse,
    selection,
  })(draft);

  // Undo and redo records must know that that something was composed on view without it being part of history stack
  const lastUndoRecord = getLastHistoryRecord(draft.undoStack, 'view');
  if (lastUndoRecord) {
    lastUndoRecord.externalChanges.push(castDraft(record.changeset));
  }
  const lastRedoRecord = getLastHistoryRecord(draft.redoStack, 'view');
  if (lastRedoRecord) {
    lastRedoRecord.externalChanges.push(castDraft(record.changeset));
  }

  const nextViewRevision = draft.viewRevision + 1;

  draft.viewChanges.push({
    viewRevision: nextViewRevision,
    changeset: castDraft(changeset),
    inverse: castDraft(inverse),
  });

  draft.viewText = castDraft(Changeset.compose(draft.viewText, changeset));

  draft.tmpRecipeResults.localTypings.push(
    castDraft({
      viewRevision: nextViewRevision,
      changeset: castDraft(changeset),
      selection,
    })
  );

  draft.viewRevision = nextViewRevision;
}
