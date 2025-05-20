import { Changeset } from '../../../common/changeset';
import { State } from '../types';

import { asComputed } from './as-computed';

export function assertValidState(state: State) {
  const computedState = asComputed(state);

  // Server * Submitted
  try {
    Changeset.assertIsComposable(state.serverText, computedState.submittedChanges);
  } catch (err) {
    throw new Error('Not composable: serverText * submittedChanges', {
      cause: err,
    });
  }

  // Submitted * Local
  try {
    Changeset.assertIsComposable(
      computedState.submittedChanges,
      computedState.localChanges
    );
  } catch (err) {
    throw new Error('Not composable: submittedChanges * localChanges', {
      cause: err,
    });
  }

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

  // First externalChange is followable on inverse
  state.undoStack.forEach((record, i) => {
    if (record.type === 'view') {
      try {
        const firstExternalChange = record.externalChanges[0];
        if (firstExternalChange) {
          Changeset.assertIsFollowable(record.inverse, firstExternalChange);
        }
      } catch (err) {
        throw new Error(`Undo record inverse and externalChange at index ${i}`, {
          cause: err,
        });
      }
    }
  });
  state.redoStack.forEach((record, i) => {
    if (record.type === 'view') {
      try {
        const firstExternalChange = record.externalChanges[0];
        if (firstExternalChange) {
          Changeset.assertIsFollowable(record.inverse, firstExternalChange);
        }
      } catch (err) {
        throw new Error(`Redo record inverse and externalChange at index ${i}`, {
          cause: err,
        });
      }
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
