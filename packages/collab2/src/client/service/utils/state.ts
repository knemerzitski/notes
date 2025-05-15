import { Changeset } from '../../../common/changeset';
import { ServiceHeadRecord, State } from '../types';
import { emptyState } from './empty-state';

export function createFromHeadRecord(record: ServiceHeadRecord): State {
  return {
    ...emptyState,
    undoStack: [
      {
        type: 'server',
        revision: record.revision,
        untilRevision: true,
      },
      ...emptyState.undoStack,
    ],
    undoStackTypeServerIndexes: [
      0,
      ...emptyState.undoStackTypeServerIndexes.map((idx) => idx + 1),
    ],
    viewChanges: [
      {
        changeset: record.text,
        inverse: Changeset.EMPTY,
        viewRevision: 0,
      },
    ],
    serverRevision: record.revision,
    serverText: record.text,
    viewText: record.text,
  };
}
