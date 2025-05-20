import { Changeset } from '../../../common/changeset';
import { State } from '../types';

export const emptyState: State = {
  undoStack: [],
  undoStackTypeServerIndexes: [],
  redoStack: [],
  viewIndexOffset: 0,
  localRecord: null,
  submittedRecord: null,
  serverRevision: 0,
  serverText: Changeset.EMPTY,
  viewText: Changeset.EMPTY,
  viewChanges: [],
  viewRevision: 0,
  tmpRecipeResults: {
    externalTypings: [],
    localTypings: [],
  },
  messagesQueue: [],
  missingMessageRevisions: null,
};
