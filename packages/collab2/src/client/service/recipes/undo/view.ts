import { castDraft, WritableDraft } from 'immer';
import { State, ViewHistoryServiceRecord } from '../../types';
import { followChangesetSelection } from '../../../../common/utils/follow-changeset-selection';
import { Changeset } from '../../../../common/changeset';
import { updateLocalRecord } from '../update-local-record';
import { castNormal } from '../../utils/cast-normal';
import { getLastHistoryRecord } from '../../utils/history-record';

/**
 * - `false` - External changes first
 * - `true` - Local changes first
 */
const INSERT_BIAS = false;

export function view(
  undoRecord: WritableDraft<ViewHistoryServiceRecord>,
  draft: WritableDraft<State>
) {
  const nextUndoRecord = getLastHistoryRecord(draft.undoStack, 'view');

  const composableIndex = undoRecord.viewIndex - draft.viewIndexOffset;
  let baseText = draft.viewChanges
    .slice(composableIndex + 1)
    .reduceRight((a, b) => Changeset.compose(a, b.inverse), castNormal(draft.viewText));

  let followRecord: WritableDraft<Parameters<typeof followChangesetSelection>[0]> = {
    changeset: undoRecord.inverse,
    inverse: undoRecord.changeset,
    selectionInverse: undoRecord.selection,
    selection: undoRecord.selectionInverse,
  };

  for (const externalChange of undoRecord.externalChanges) {
    if (nextUndoRecord) {
      nextUndoRecord.externalChanges.push(
        castDraft(Changeset.follow(externalChange, followRecord.changeset, !INSERT_BIAS))
      );
    }

    baseText = Changeset.compose(baseText, externalChange);

    followRecord = castDraft(
      followChangesetSelection(followRecord, externalChange, baseText, INSERT_BIAS)
    );
  }

  const applyRecord = followRecord;

  if (Changeset.isNoOp(draft.viewText, applyRecord.changeset)) {
    // TODO context option to decide if pushing no-op record into redoStack?
    draft.redoStack.push({
      type: 'view',
      viewIndex: undoRecord.viewIndex - 1,
      externalChanges: [undoRecord.changeset, ...undoRecord.externalChanges],
      changeset: undoRecord.inverse,
      inverse: undoRecord.changeset,
      selectionInverse: undoRecord.selection,
      selection: undoRecord.selectionInverse,
    });

    return false;
  } else {
    draft.redoStack.push({
      type: 'view',
      viewIndex: draft.viewChanges.length + draft.viewIndexOffset,
      externalChanges: [],
      changeset: applyRecord.changeset,
      inverse: applyRecord.inverse,
      selectionInverse: applyRecord.selectionInverse,
      selection: applyRecord.selection,
    });

    updateLocalRecord(applyRecord)(draft);

    const nextViewRevision = draft.viewRevision + 1;

    draft.viewChanges.push({
      viewRevision: nextViewRevision,
      changeset: applyRecord.changeset,
      inverse: castDraft(Changeset.inverse(applyRecord.changeset, draft.viewText)),
    });
    draft.viewText = castDraft(Changeset.compose(draft.viewText, applyRecord.changeset));

    draft.tmpRecipeResults.localTypings.push({
      viewRevision: nextViewRevision,
      changeset: applyRecord.changeset,
      selection: applyRecord.selection,
    });

    draft.viewRevision = nextViewRevision;

    return true;
  }
}
