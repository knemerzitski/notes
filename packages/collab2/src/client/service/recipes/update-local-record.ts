import { WritableDraft, castDraft } from 'immer';

import { Changeset } from '../../../common/changeset';
import { LocalServiceRecord, State } from '../types';
import { asComputed } from '../utils/as-computed';

export function updateLocalRecord(newLocalRecord: LocalServiceRecord) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    const localChanges = computedDraft.localChanges;
    const submittedText = computedDraft.submittedText;

    const newLocalChanges = Changeset.removeNoOps(
      Changeset.compose(localChanges, newLocalRecord.changeset),
      submittedText.getText()
    );

    if (Changeset.isNoOp(submittedText, newLocalChanges)) {
      // Local changes have no visual difference, clear it
      draft.localRecord = null;
      return false;
    }

    draft.localRecord = {
      changeset: castDraft(newLocalChanges),
      selectionInverse:
        draft.localRecord?.selectionInverse ?? newLocalRecord.selectionInverse,
      selection: newLocalRecord.selection,
    };

    return true;
  };
}
