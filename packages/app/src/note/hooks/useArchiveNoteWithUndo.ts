import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { wrapArray } from '../../../../utils/src/array/wrap-array';

import { isDefined } from '../../../../utils/src/type-guards/is-defined';

import { gql } from '../../__generated__';
import { MovableNoteCategory, Note } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useUndoAction } from '../../utils/context/undo-action';
import { getCategoryName } from '../models/note/category-name';
import { getUserNoteLinkId } from '../utils/id';
import { toMovableNoteCategory } from '../utils/note-category';

import { useMoveNote } from './useMoveNote';

const UseArchiveNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseArchiveNoteWithUndo_UserNoteLinkFragment on UserNoteLink {
    id
  }
`);

export function useArchiveNoteWithUndo() {
  const client = useApolloClient();
  const userId = useUserId();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  return useCallback(
    (noteId: Note['id'] | readonly Note['id'][]) => {
      const noteIds = wrapArray(noteId);
      if (noteIds.length === 0) {
        return;
      }

      const noteIdsData = noteIds
        .map((noteId) => {
          const oldCategoryName = getCategoryName({ noteId }, client.cache);

          const oldMovableCategoryName = toMovableNoteCategory(oldCategoryName);
          if (!oldMovableCategoryName) {
            return;
          }

          if (oldMovableCategoryName === MovableNoteCategory.ARCHIVE) {
            return;
          }

          void moveNote(
            { noteId },
            {
              categoryName: MovableNoteCategory.ARCHIVE,
            }
          );

          return {
            noteId,
            oldMovableCategoryName,
            sub: client
              .watchFragment({
                fragment: UseArchiveNoteWithUndo_UserNoteLinkFragment,
                from: {
                  __typename: 'UserNoteLink',
                  id: getUserNoteLinkId(noteId, userId),
                },
              })
              .subscribe((value) => {
                if (!value.complete) {
                  // If any of the archived note is deleted, close undo action
                  closeUndoAction();
                }
              }),
          };
        })
        .filter(isDefined);

      const closeUndoAction = undoAction(
        noteIds.length > 1 ? 'Notes archived' : 'Note archived',
        () => {
          noteIdsData.forEach(({ noteId, oldMovableCategoryName }) => {
            void moveNote(
              {
                noteId,
              },
              {
                categoryName: oldMovableCategoryName,
              }
            );
          });
        },
        {
          key: `Note:${noteIds.join(',')}-move`,
          onRemoved: () => {
            noteIdsData.forEach(({ sub }) => {
              sub.unsubscribe();
            });
          },
        }
      );

      return;
    },
    [moveNote, undoAction, client, userId]
  );
}
