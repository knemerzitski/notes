import { acknowledgeSubmittedRecord } from './acknowledge-submitted-record';
import { addIncomingServerMessage } from './add-incoming-server-message';
import { addLocalTyping } from './add-local-typing';
import { cleanupUndoStack } from './cleanup-undo-stack';
import { processExternalTyping } from './process-external-typing';
import { redo } from './redo';
import { removeUnusedViewChanges } from './remove-unused-view-changes';
import { resetExternalTypings } from './reset-external-typings';
import { resetLocalTypings } from './reset-local-typings';
import { submitChanges } from './submit-changes';
import { undo } from './undo';
import { updateMissingRevisions } from './update-missing-revisions';

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
