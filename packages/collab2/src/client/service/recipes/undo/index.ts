import { WritableDraft } from 'immer';

import { HistoryServiceRecord, State } from '../../types';

import { server } from './server';
import { view } from './view';

export function undo(...args: Parameters<typeof server>) {
  const serverWithArgs = server(...args);

  return (draft: WritableDraft<State>) => {
    let prevRecord: WritableDraft<HistoryServiceRecord> | undefined;
    let record: WritableDraft<HistoryServiceRecord> | undefined;
    while ((record = draft.undoStack.pop()) !== undefined) {
      if (prevRecord === record) {
        break;
      }
      prevRecord = record;

      if (record.type === 'view') {
        if (view(record, draft)) {
          // Undo success
          break;
        }
      } else {
        // type === 'server'
        draft.undoStackTypeServerIndexes.pop();

        const result = serverWithArgs(record, draft);
        if (result === undefined) {
          // Couldn't determine undo due to lack of information from server
          // Can try again later
          // TODO option to skip over server record
          draft.undoStackTypeServerIndexes.push(draft.undoStack.length);
          draft.undoStack.push(record);
          break;
        }

        if (result) {
          // Undo success
          break;
        }
      }
    }
  };
}
