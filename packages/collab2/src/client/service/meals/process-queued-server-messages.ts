import { WritableDraft } from 'immer';

import { ComputedState } from '../computed-state';
import { $recipes } from '../recipes';
import { IncomingServerMessage, Properties, State } from '../types';

export function* processQueuedServerMessages(
  computedState: ComputedState,
  props: Pick<Properties, 'isExternalTypingHistory'>
) {
  let prevMessage: IncomingServerMessage | undefined;
  let message: IncomingServerMessage | undefined;
  while ((message = computedState.state.messagesQueue[0]) !== undefined) {
    if (message === prevMessage) {
      // Stop processing messages if first message hasn't changed
      break;
    }
    prevMessage = message;

    const definedMessage = message;

    const nextRevision = computedState.serverRevision + 1;
    const isNextRevision = nextRevision === message.item.revision;
    if (!isNextRevision || computedState.state.missingMessageRevisions) {
      yield {
        type: 'missing-revisions' as const,
        recipe: (draft: WritableDraft<State>) => {
          $recipes.updateMissingRevisions(definedMessage)(draft);
        },
      };

      if (!isNextRevision) {
        // Missing messages, cannot process next one
        break;
      }
    }

    if (definedMessage.type === 'external-typing') {
      yield {
        type: 'message' as const,
        message: definedMessage,
        recipe: (draft: WritableDraft<State>) => {
          $recipes.processExternalTyping(definedMessage.item, props)(draft);
          draft.messagesQueue.shift();
        },
      };
    } else {
      // local-typing-acknowledged
      yield {
        type: 'message' as const,
        message: definedMessage,
        recipe: (draft: WritableDraft<State>) => {
          $recipes.acknowledgeSubmittedRecord(definedMessage.item)(draft);
          draft.messagesQueue.shift();
        },
      };
    }
  }
}
