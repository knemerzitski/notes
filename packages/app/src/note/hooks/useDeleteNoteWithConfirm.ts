import { useCallback } from 'react';

import { wrapArray } from '../../../../utils/src/array/wrap-array';

import { Note } from '../../__generated__/graphql';
import { useShowConfirm } from '../../utils/context/show-confirm';

import { useDeleteNote } from './useDeleteNote';

export function useDeleteNoteWithConfirm() {
  const deleteNote = useDeleteNote();
  const showConfirm = useShowConfirm();

  return useCallback(
    (noteId: Note['id'] | readonly Note['id'][]) => {
      const noteIds = wrapArray(noteId);
      if (noteIds.length === 0) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((res) => {
        showConfirm(
          noteIds.length > 1 ? 'Delete notes forever?' : 'Delete note forever?',
          {
            onSuccess() {
              noteIds.forEach((noteId) => {
                void deleteNote({ noteId });
              });
              res(true);
            },
            onCancel() {
              res(false);
            },
          }
        );
      });
    },
    [deleteNote, showConfirm]
  );
}
