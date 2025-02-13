import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { wrapArray } from '~utils/array/wrap-array';

import { gql } from '../../__generated__';
import { MovableNoteCategory, Note } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useUndoAction } from '../../utils/context/undo-action';
import { getOriginalCategoryName } from '../models/note/original-category-name';
import { getUserNoteLinkId } from '../utils/id';

import { useMoveNote } from './useMoveNote';

import { useTrashNote } from './useTrashNote';

const UseRestoreNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseRestoreNoteWithUndo_UserNoteLinkFragment on UserNoteLink {
    id
  }
`);

export function useRestoreNoteWithUndo() {
  const client = useApolloClient();
  const userId = useUserId();
  const trashNote = useTrashNote();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  return useCallback(
    (noteId: Note['id'] | readonly Note['id'][]) => {
      const noteIds = wrapArray(noteId);
      if (noteIds.length === 0) {
        return;
      }

      const watchFragmentSubs = noteIds.map((noteId) => {
        // Mutation
        void moveNote(
          { noteId },
          {
            categoryName:
              getOriginalCategoryName({ noteId }, client.cache) ??
              MovableNoteCategory.DEFAULT,
          }
        );

        return client
          .watchFragment({
            fragment: UseRestoreNoteWithUndo_UserNoteLinkFragment,
            from: {
              __typename: 'UserNoteLink',
              id: getUserNoteLinkId(noteId, userId),
            },
          })
          .subscribe((value) => {
            if (!value.complete) {
              // If any of the trashed note is deleted, close undo action
              closeUndoAction();
            }
          });
      });

      const closeUndoAction = undoAction(
        noteIds.length > 1 ? 'Notes restored' : 'Note restored',
        () => {
          noteIds.forEach((noteId) => {
            void trashNote({
              noteId,
            });
          });
        },
        {
          key: `Note:${noteIds.join(',')}-move`,
          onRemoved: () => {
            watchFragmentSubs.forEach((sub) => {
              sub.unsubscribe();
            });
          },
        }
      );
    },
    [trashNote, moveNote, undoAction, client, userId]
  );
}
