import { WritableDraft } from 'immer';
import { Context, State } from '../types';
import { asComputed } from '../utils/as-computed';

export function submitChanges(context: Pick<Context, 'generateSubmitId'>) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    if (!computedDraft.canSubmitChanges || !draft.localRecord) {
      return;
    }

    draft.submittedRecord = {
      id: context.generateSubmitId(),
      targetRevision: draft.serverRevision,
      changeset: draft.localRecord.changeset,
      selectionInverse: draft.localRecord.selectionInverse,
      selection: draft.localRecord.selection,
    };

    draft.localRecord = null;
  };
}
