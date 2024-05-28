import { useEffect } from 'react';

import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-adapter';
import { getCollabEditorMaybe } from '../../collab/hooks/useCollabEditor';
import { useNoteContentIdMaybe } from '../context/NoteContentIdProvider';
import { useCurrentUserId } from '../../auth/user';

export const SUBSCRIPTION = gql(`
  subscription ExternalChangesNewRecord($input: NoteUpdatedInput) {
    noteUpdated(input: $input) {
      patch {
        id
        textFields {
          value {
            id
            newRecord {
              id
              creatorUserId
              change {
                revision
                changeset
              }
              beforeSelection {
                start
                end
              }
              afterSelection {
                start
                end
              }
            }
          }
        }
      }
    }
  }
`);

const FRAGMENT_RECORDS = gql(`
  fragment ExternalChangesUpdateCache on CollabText {
    recordsConnection {
      records {
        id
        creatorUserId
        change {
          revision
          changeset
        }
        beforeSelection {
          start
          end
        }
        afterSelection {
          start
          end
        }
      }
    }

  }
`);

/**
 * Subscribe to specific note updates. If unspecified then subscribes
 * to all notes of current user.
 */
export default function ExternalChangesSubscription() {
  const apolloClient = useApolloClient();
  const currentUserId = useCurrentUserId();
  const noteContentId = useNoteContentIdMaybe();

  useEffect(() => {
    if (!currentUserId) return;
    const observable = apolloClient.subscribe({
      query: SUBSCRIPTION,
      variables: noteContentId
        ? {
            input: {
              contentId: noteContentId,
            },
          }
        : undefined,
    });

    const sub = observable.subscribe({
      next(value) {
        if (!value.data) return;

        value.data.noteUpdated.patch.textFields?.forEach(({ value }) => {
          const { id: collabTextId, newRecord } = value;
          if (!newRecord) return;

          // Update cache with new record
          apolloClient.cache.writeFragment({
            id: apolloClient.cache.identify({
              id: collabTextId,
              __typename: 'CollabText',
            }),
            fragment: FRAGMENT_RECORDS,
            data: {
              recordsConnection: {
                records: [newRecord],
              },
            },
          });

          const editor = getCollabEditorMaybe(apolloClient, collabTextId);
          if (editor) {
            editor.handleExternalChange(
              collabTextRecordToEditorRevisionRecord(newRecord)
            );
          }
        });
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, noteContentId, currentUserId]);

  return null;
}
