import { acknowledgeSubmittedRecord } from './acknowledge-submitted-record';
import { addIncomingServerMessage } from './add-incoming-server-message';
import { addLocalTyping } from './add-local-typing';
import { processExternalTyping } from './process-external-typing';
import { submitChanges } from './submit-changes';
import { undo } from './undo';
import { redo } from './redo';
import { updateMissingRevisions } from './update-missing-revisions';
import { resetExternalTypings } from './reset-external-typings';
import { resetLocalTypings } from './reset-local-typings';
import { removeUnusedViewChanges } from './remove-unused-view-changes';
import { cleanupUndoStack } from './cleanup-undo-stack';

export const $recipes = {
  addLocalTyping,
  submitChanges,
  addIncomingServerMessage,
  acknowledgeSubmittedRecord,
  processExternalTyping,
  updateMissingRevisions,
  undo,
  redo,
  resetExternalTypings,
  resetLocalTypings,
  cleanupUndoStack,
  removeUnusedViewChanges,
} as const;
