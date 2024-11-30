import { useApolloClient } from '@apollo/client';
import { gql } from '../../__generated__';
import { useEffect } from 'react';
import { useUserId } from '../../user/context/user-id';
import { useDeleteNote } from '../hooks/useDeleteNote';
import { useTrashNote } from '../hooks/useTrashNote';
import { removeUserOperations } from '../../user/models/operations/remove';
import { useMoveNote } from '../hooks/useMoveNote';
import { MovableNoteCategory } from '../../__generated__/graphql';

const ProcessNoteUserOperations_Query = gql(`
  query ProcessNoteUserOperations_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        operations {
          id
          ... on DeleteNoteUserOperation {
            userNoteLink {
              id
            }
          }
          ... on TrashNoteUserOperation {
            userNoteLink {
              id
            }
          }
          ... on MoveNoteUserOperation {
            userNoteLink {
              id
              note {
                id
              }
            }
            location {
              categoryName
              anchorUserNoteLink {
                id
                note {
                  id
                }
              }
              anchorPosition
            }
          }
        }
      }
    }
  }
`);

export function ProcessNoteUserOperations() {
  const client = useApolloClient();
  const userId = useUserId();
  const deleteNote = useDeleteNote();
  const trashNote = useTrashNote();
  const moveNote = useMoveNote();

  useEffect(() => {
    const observable = client.watchQuery({
      query: ProcessNoteUserOperations_Query,
      variables: {
        id: userId,
      },
      fetchPolicy: 'cache-only',
    });

    const sub = observable.subscribe(({ data }) => {
      const user = data.signedInUser;
      if (!user) {
        return;
      }

      const deleteIds: string[] = [];

      for (const operation of user.local.operations) {
        switch (operation.__typename) {
          case 'DeleteNoteUserOperation':
            void deleteNote({
              userNoteLinkId: operation.userNoteLink.id,
            });
            deleteIds.push(operation.id);
            break;
          case 'TrashNoteUserOperation':
            void trashNote({
              userNoteLinkId: operation.userNoteLink.id,
            });
            deleteIds.push(operation.id);
            break;
          case 'MoveNoteUserOperation':
            void moveNote(
              {
                userNoteLinkId: operation.userNoteLink.id,
              },
              {
                categoryName:
                  operation.location?.categoryName ?? MovableNoteCategory.DEFAULT,
                anchorNoteId: operation.location?.anchorUserNoteLink?.note.id,
                anchorPosition: operation.location?.anchorPosition,
              }
            );
            deleteIds.push(operation.id);
            break;
        }
      }

      removeUserOperations(userId, deleteIds, client.cache);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, userId, deleteNote, trashNote, moveNote]);

  return null;
}
