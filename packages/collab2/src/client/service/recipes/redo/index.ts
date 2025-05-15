import { WritableDraft } from 'immer';
import { HistoryServiceRecord, State } from '../../types';
import { view } from './view';
import { server } from './server';

export function redo(...args: Parameters<typeof server>) {
  const serverWithArgs = server(...args);

  return (draft: WritableDraft<State>) => {
    let prevRecord: WritableDraft<HistoryServiceRecord> | undefined;
    let record: WritableDraft<HistoryServiceRecord> | undefined;
    while ((record = draft.redoStack.pop()) !== undefined) {
      if (prevRecord === record) {
        break;
      }
      prevRecord = record;

      if (record.type === 'view') {
        if (view(record, draft)) {
          // Redo success
          break;
        }
      } else {
        // type === 'server'
        const result = serverWithArgs(record, draft);
        if (result === undefined) {
          // Couldn't determine redo due to lack of information from server
          // Can try again later
          // TODO option to skip over server records?
          draft.redoStack.push(record);
          break;
        }

        if (result) {
          // Redo success
          break;
        }
      }
    }
  };
}
