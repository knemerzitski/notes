import { castDraft, WritableDraft } from 'immer';
import { IncomingServerMessage, State } from '../types';
import { asComputed } from '../utils/as-computed';

/**
 * Checks validity of the message and adds it to `messagesQueue`
 */
export function addIncomingServerMessage(incomingMessage: IncomingServerMessage) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);
    if (incomingMessage.item.revision <= computedDraft.serverRevision) {
      // Discard old
      return;
    }

    const isDuplicateRevision = draft.messagesQueue.some(
      (item) => item.item.revision === incomingMessage.item.revision
    );
    if (isDuplicateRevision) {
      // Discard duplicate
      return;
    }

    draft.messagesQueue.push(castDraft(incomingMessage));
    draft.messagesQueue.sort((a, b) => a.item.revision - b.item.revision);
  };
}
