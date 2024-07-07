import { useCallback } from 'react';

import { Note } from '../../../__generated__/graphql';
import { useSnackbarAlert } from '../../common/components/SnackbarAlertProvider';
import { NoteCollabTextEditors } from '../context/NoteTextFieldEditorsProvider';

import useDeleteNote from './useDeleteNote';

export interface UseDiscardEmptyNoteOptions {
  note?: Pick<Note, 'contentId'> | null;
  editors: NoteCollabTextEditors;
}

export default function useDiscardEmptyNote() {
  const deleteNote = useDeleteNote();
  const showAlert = useSnackbarAlert();

  return useCallback(
    ({ note, editors }: UseDiscardEmptyNoteOptions) => {
      if (!note) return false;

      const noteHasSomeText = editors.some(
        ({ value: editor }) => editor.viewText.trim().length > 0
      );
      if (noteHasSomeText) return false;

      setTimeout(() => {
        showAlert({
          children: 'Empty note discarded',
          icon: false,
        });
        void deleteNote(note.contentId);
      }, 0);

      return true;
    },
    [deleteNote, showAlert]
  );
}
