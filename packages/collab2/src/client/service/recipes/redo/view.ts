import { castDraft, WritableDraft } from 'immer';
import { State, ViewHistoryServiceRecord } from '../../types';
import { getLastHistoryRecord } from '../../utils/history-record';
import { castNormal } from '../../utils/cast-normal';
import { Changeset } from '../../../../common/changeset';
import { followChangesetSelection } from '../../../../common/utils/follow-changeset-selection';
import { updateLocalRecord } from '../update-local-record';

/**
 * - `false` - External changes first
 * - `true` - Local changes first
 */
const INSERT_BIAS = true;

export function view(
  redoRecord: WritableDraft<ViewHistoryServiceRecord>,
  draft: WritableDraft<State>
) {
  const nextRedoRecord = getLastHistoryRecord(draft.redoStack, 'view');

  const composableIndex = redoRecord.viewIndex - draft.viewIndexOffset;
  let baseText = draft.viewChanges
    .slice(composableIndex + 1)
    .reduceRight((a, b) => Changeset.compose(a, b.inverse), castNormal(draft.viewText));

  let followRecord: WritableDraft<Parameters<typeof followChangesetSelection>[0]> = {
    changeset: redoRecord.inverse,
    inverse: redoRecord.changeset,
    selectionInverse: redoRecord.selection,
    selection: redoRecord.selectionInverse,
  };

  for (const externalChange of redoRecord.externalChanges) {
    if (nextRedoRecord) {
      nextRedoRecord.externalChanges.push(
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
    return false;
  } else {
    draft.undoStack.push({
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
