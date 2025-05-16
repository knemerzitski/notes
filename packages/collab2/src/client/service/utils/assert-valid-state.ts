import { Changeset } from '../../../common/changeset';
import { State } from '../types';

export function assertValidState(state: State) {
  // Changeset and its inverse are composable
  state.undoStack.forEach((record, i) => {
    if (record.type === 'view') {
      try {
        Changeset.assertIsComposable(record.changeset, record.inverse);
      } catch (err) {
        throw new Error(`Undo record at index ${i}`, {
          cause: err,
        });
      }
    }
  });
  state.redoStack.forEach((record, i) => {
    if (record.type === 'view') {
      try {
        Changeset.assertIsComposable(record.changeset, record.inverse);
      } catch (err) {
        throw new Error(`Redo record at index ${i}`, {
          cause: err,
        });
      }
    }
  });
  state.viewChanges.forEach((record, i) => {
    try {
      Changeset.assertIsComposable(record.changeset, record.inverse);
    } catch (err) {
      throw new Error(`View change record at index ${i}`, {
        cause: err,
      });
    }
  });
}
