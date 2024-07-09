import { useEffect } from 'react';

import { gql } from '../../../../__generated__/gql';
import { useCustomApolloClient } from '../../../apollo-client/context/CustomApolloClientProvider';
import { useCurrentUserId } from '../../../auth/user';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/editor-graphql-mapping';
import { getCollabEditorMaybe } from '../../../collab/hooks/useCollabEditor';
import { useNoteContentId } from '../context/NoteContentIdProvider';

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
  const customApolloClient = useCustomApolloClient();
  const currentUserId = useCurrentUserId();
  const noteContentId = useNoteContentId(true);

  useEffect(() => {
    if (!currentUserId) return;
    const observable = customApolloClient.client.subscribe({
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
          customApolloClient.writeFragmentNoRetain({
            id: customApolloClient.cache.identify({
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

          const editor = getCollabEditorMaybe(customApolloClient.client, collabTextId);
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
  }, [customApolloClient, noteContentId, currentUserId]);

  return null;
}
