import { castDraft, WritableDraft } from 'immer';
import { Context, Properties, ServerHistoryServiceRecord, State } from '../../types';
import { followChangesetSelection } from '../../../../common/utils/follow-changeset-selection';
import { Changeset } from '../../../../common/changeset';
import { asComputed } from '../../utils/as-computed';
import { updateLocalRecord } from '../update-local-record';
import { collectValuesUntil } from '../../utils/collect-values-until';

/**
 * - `false` - External changes first
 * - `true` - Local changes first
 */
const INSERT_BIAS = false;

/**
 * Redoes a server records by retrieving record from server
 */
export function server(
  props: Pick<Properties, 'serverFacades'> & {
    readonly context: Pick<Context, 'isExternalTypingHistory'>;
  }
) {
  return (record: ServerHistoryServiceRecord, draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    const isExternalTypingHistory = props.context.isExternalTypingHistory;

    const serverFacades = props.serverFacades;
    if (serverFacades.size === 0) {
      return;
    }

    const typingToTarget_records = collectValuesUntil(
      serverFacades.olderIterable(record.revision + 1),
      (serverRecord) => ({
        value: serverRecord,
        done: isExternalTypingHistory(serverRecord),
      })
    );
    typingToTarget_records.reverse();

    const undoRecord = typingToTarget_records[0];
    if (!undoRecord || !isExternalTypingHistory(undoRecord)) {
      return;
    }

    const tailRecord = serverFacades.text(undoRecord.revision);
    if (!tailRecord) {
      return;
    }

    const targetToHead_records = [
      ...serverFacades.range(record.revision + 1, draft.serverRevision + 1),
    ];

    const followChanges = [
      ...typingToTarget_records.slice(1).map((r) => r.changeset),
      ...targetToHead_records.map((r) => r.changeset),
      computedDraft.submittedChanges,
      computedDraft.localChanges,
    ];

    let baseText = tailRecord.text;

    let followRecord: WritableDraft<Parameters<typeof followChangesetSelection>[0]> = {
      changeset: castDraft(undoRecord.inverse),
      inverse: castDraft(undoRecord.changeset),
      selectionInverse: undoRecord.selection,
      selection: undoRecord.selectionInverse,
    };

    for (const change of followChanges) {
      baseText = Changeset.compose(baseText, change);
      followRecord = castDraft(
        followChangesetSelection(followRecord, change, baseText, INSERT_BIAS)
      );
      if (followRecord.changeset.isIdentity()) {
        break;
      }
    }

    const applyRecord = followRecord;

    // Push next revision for restore if available
    if (record.untilRevision != null) {
      const currentRevision = undoRecord.revision;
      const nextRevision = currentRevision - 1;

      const isRestoreNext =
        record.untilRevision === true || record.untilRevision <= nextRevision;

      if (isRestoreNext && serverFacades.hasOlderThan(currentRevision)) {
        draft.undoStackTypeServerIndexes.push(draft.undoStack.length);
        draft.undoStack.push({
          type: 'server',
          revision: nextRevision,
          untilRevision: record.untilRevision,
        });
      }
    }

    if (Changeset.isNoOp(draft.viewText, applyRecord.changeset)) {
      // TODO context option to decide if pushing no-op record into redoStack?
      draft.redoStack.push({
        type: 'server',
        revision: undoRecord.revision,
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
