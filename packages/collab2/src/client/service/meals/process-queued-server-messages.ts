import { Context, IncomingServerMessage, State } from '../types';
import { ComputedState } from '../computed-state';
import { WritableDraft } from 'immer';
import { $recipes } from '../recipes';

export function* processQueuedServerMessages(
  computedState: ComputedState,
  context: Context
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

    if (message.type === 'external-typing') {
      yield {
        type: 'message' as const,
        message: definedMessage,
        recipe: (draft: WritableDraft<State>) => {
          $recipes.processExternalTyping(definedMessage.item, context)(draft);
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
