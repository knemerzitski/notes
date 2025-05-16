import { Changeset } from '../../../common/changeset';
import { State } from '../types';

export function assertValidState(state: State) {
  // Inverse is composable on changeset
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

  // Undo/redo record is not no-op
  state.undoStack.forEach((record, i) => {
    if (record.type === 'view') {
      if (Changeset.isNoOp(record.changeset, record.inverse)) {
        throw new Error(
          `Undo record is no-op at index ${i}, A${String(record.changeset)} * B${String(record.inverse)}`
        );
      }
    }
  });
  state.redoStack.forEach((record, i) => {
    if (record.type === 'view') {
      if (Changeset.isNoOp(record.changeset, record.inverse)) {
        throw new Error(
          `Redo record is no-op at index ${i}, A${String(record.changeset)} * B${String(record.inverse)}`
        );
      }
    }
  });
}
