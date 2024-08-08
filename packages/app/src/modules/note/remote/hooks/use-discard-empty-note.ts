import { useCallback } from 'react';

import { Note } from '../../../../__generated__/graphql';
import { useSnackbarAlert } from '../../../common/components/snackbar-alert-provider';
import { NoteCollabTextEditors } from '../context/note-text-field-editors-provider';

import { useDeleteNote } from './use-delete-note';

export interface UseDiscardEmptyNoteOptions {
  note?: Pick<Note, 'contentId'> | null;
  editors: NoteCollabTextEditors;
}

export function useDiscardEmptyNote() {
  const deleteNote = useDeleteNote();
  const showAlert = useSnackbarAlert();

  return useCallback(
    ({ note, editors }: UseDiscardEmptyNoteOptions) => {
      if (!note) return false;

      const noteHasSomeText = editors.some(
        ({ value: editor }) => editor.viewText.trim().length > 0
      );
      if (noteHasSomeText) return false;

      showAlert({
        children: 'Empty note discarded',
        icon: false,
      });

      void deleteNote(note.contentId);

      return true;
    },
    [deleteNote, showAlert]
  );
}
