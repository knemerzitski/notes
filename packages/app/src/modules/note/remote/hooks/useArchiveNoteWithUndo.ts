import { useCallback } from 'react';

import { NoteCategory } from '../../../../__generated__/graphql';
import { useSnackbarUndoAction } from '../../../common/components/SnackbarAlertProvider';

import useUpdateNoteCategory from './useUpdateNoteCategory';

export default function useArchiveNoteWithUndo(noteContentId?: string): () => void {
  const updateNoteCategory = useUpdateNoteCategory();
  const snackbarUndoAction = useSnackbarUndoAction();

  return useCallback(() => {
    if (!noteContentId) return;

    const result = updateNoteCategory({
      contentId: noteContentId,
      categoryName: NoteCategory.ARCHIVE,
    });

    if (result) {
      const oldCategoryName = result.oldNote.categoryName;
      snackbarUndoAction('Note archived', () => {
        updateNoteCategory({
          contentId: noteContentId,
          categoryName: oldCategoryName,
        });
      });
    }
  }, [updateNoteCategory, snackbarUndoAction, noteContentId]);
}
