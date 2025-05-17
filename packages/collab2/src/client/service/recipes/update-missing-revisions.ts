import { WritableDraft } from 'immer';

import { IncomingServerMessage, State } from '../types';
import { asComputed } from '../utils/as-computed';

export function updateMissingRevisions(message: IncomingServerMessage) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    const nextRevision = computedDraft.serverRevision + 1;
    const isNextRevision = nextRevision === message.item.revision;
    if (isNextRevision) {
      if (!draft.missingMessageRevisions) {
        return;
      }

      draft.missingMessageRevisions = {
        ...draft.missingMessageRevisions,
        startRevision: nextRevision,
      };

      if (
        draft.missingMessageRevisions.startRevision >=
        draft.missingMessageRevisions.endRevision
      ) {
        draft.missingMessageRevisions = null;
      }
    } else {
      if (draft.missingMessageRevisions) {
        draft.missingMessageRevisions = {
          startRevision: nextRevision,
          endRevision: Math.max(
            message.item.revision,
            draft.missingMessageRevisions.endRevision
          ),
        };
      } else {
        draft.missingMessageRevisions = {
          startRevision: nextRevision,
          endRevision: message.item.revision,
        };
      }
    }
  };
}
