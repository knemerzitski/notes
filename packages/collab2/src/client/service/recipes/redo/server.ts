import { castDraft, WritableDraft } from 'immer';

import { Changeset } from '../../../../common/changeset';
import { followChangesetSelection } from '../../../../common/utils/follow-changeset-selection';
import { Properties, ServerHistoryServiceRecord, State } from '../../types';
import { asComputed } from '../../utils/as-computed';
import { updateLocalRecord } from '../update-local-record';
import { getLastHistoryRecord } from '../../utils/history-record';

/**
 * - `false` - External changes first
 * - `true` - Local changes first
 */
const INSERT_BIAS = true;

/**
 * Undoes a server records by retrieving record from server
 */
export function server(props: Pick<Properties, 'serverFacades'>) {
  return (record: ServerHistoryServiceRecord, draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);

    const serverFacades = props.serverFacades;
    if (serverFacades.size === 0) {
      return;
    }

    const redoRecord = serverFacades.at(record.revision);
    if (!redoRecord) {
      return;
    }

    const tailRecord = serverFacades.text(redoRecord.revision - 1);
    if (!tailRecord) {
      return;
    }

    const nextRedoRecord = getLastHistoryRecord(draft.redoStack, 'view');

    const targetToHead_records = [
      ...serverFacades.range(redoRecord.revision, draft.serverRevision + 1),
    ];

    const followChanges = [
      ...targetToHead_records.map((r) => r.changeset),
      computedDraft.submittedChanges,
      computedDraft.localChanges,
    ];

    let baseText = tailRecord.text;

    let followRecord: WritableDraft<Parameters<typeof followChangesetSelection>[0]> = {
      changeset: castDraft(redoRecord.changeset),
      inverse: castDraft(redoRecord.inverse),
      selectionInverse: redoRecord.selectionInverse,
      selection: redoRecord.selection,
    };

    for (const change of followChanges) {
      baseText = Changeset.compose(baseText, change);
      followRecord = castDraft(
        followChangesetSelection(followRecord, change, baseText, INSERT_BIAS)
      );
      if (followRecord.changeset.isIdentity()) {
        return false;
      }
    }

    const applyRecord = followRecord;

    if (nextRedoRecord) {
      nextRedoRecord.externalChanges.push(applyRecord.changeset);
    }

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
        inverse: applyRecord.inverse,
      });
      draft.viewText = castDraft(
        Changeset.compose(draft.viewText, applyRecord.changeset)
      );

      draft.tmpRecipeResults.localTypings.push({
        viewRevision: nextViewRevision,
        changeset: applyRecord.changeset,
        selection: applyRecord.selection,
      });

      draft.viewRevision = nextViewRevision;

      return true;
    }
  };
}
