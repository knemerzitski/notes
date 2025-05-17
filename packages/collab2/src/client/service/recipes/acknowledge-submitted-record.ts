import { ServiceServerRecord, State } from '../types';
import { castDraft, WritableDraft } from 'immer';
import { asComputed } from '../utils/as-computed';
import { Changeset } from '../../../common/changeset';

export function acknowledgeSubmittedRecord(
  acknowledgedRecord: Pick<ServiceServerRecord, 'revision' | 'changeset'>
) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    if (!computedDraft.haveSubmittedChanges) {
      return;
    }

    draft.serverRevision = acknowledgedRecord.revision;
    draft.serverText = castDraft(
      Changeset.compose(draft.serverText, acknowledgedRecord.changeset)
    );
    draft.submittedRecord = null;
  };
}
