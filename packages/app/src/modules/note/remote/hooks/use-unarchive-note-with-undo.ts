import { useCallback } from 'react';

import { NoteCategory } from '../../../../__generated__/graphql';
import { useSnackbarUndoAction } from '../../../common/components/snackbar-alert-provider';

import { useUpdateNoteCategory } from './use-update-note-category';

export function useUnarchiveNoteWithUndo(noteContentId?: string): () => void {
  const updateNoteCategory = useUpdateNoteCategory();
  const snackbarUndoAction = useSnackbarUndoAction();

  return useCallback(() => {
    if (!noteContentId) return;

    const result = updateNoteCategory({
      contentId: noteContentId,
      categoryName: NoteCategory.DEFAULT,
    });

    if (result) {
      const oldCategoryName = result.oldNote.categoryName;
      snackbarUndoAction('Note unarchived', () => {
        updateNoteCategory({
          contentId: noteContentId,
          categoryName: oldCategoryName,
        });
      });
    }
  }, [updateNoteCategory, snackbarUndoAction, noteContentId]);
}
