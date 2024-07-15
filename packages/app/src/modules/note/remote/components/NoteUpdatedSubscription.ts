import { useEffect } from 'react';

import { gql } from '../../../../__generated__/gql';
import { useCustomApolloClient } from '../../../apollo-client/context/CustomApolloClientProvider';
import { useCurrentUserId } from '../../../auth/user';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/editor-graphql-mapping';
import { getCollabEditorMaybe } from '../../../collab/hooks/useCollabEditor';
import { useNoteContentId } from '../context/NoteContentIdProvider';

export const SUBSCRIPTION = gql(`
  subscription NoteUpdated($input: NoteUpdatedInput) {
    noteUpdated(input: $input) {
      contentId
      patch {
        id
        sharing {
          id
        }
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

const FRAGMENT_COLLABTEXT = gql(`
  fragment NoteUpdatedCollabTextCache on CollabText {
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

const FRAGMENT_NOTE = gql(`
  fragment NoteUpdatedNoteCache on Note {
    sharing {
      id
    }    
  }
`);

/**
 * Subscribe to specific note updates. If unspecified then subscribes
 * to all notes of current user.
 */
export default function NoteUpdatedSubscription() {
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
        const noteUpdated = value.data?.noteUpdated;
        if (!noteUpdated) return;

        // Note
        if (noteUpdated.patch.sharing) {
          customApolloClient.writeFragmentNoRetain({
            id: customApolloClient.cache.identify({
              contentId: noteUpdated.contentId,
              __typename: 'Note',
            }),
            fragment: FRAGMENT_NOTE,
            data: {
              sharing: noteUpdated.patch.sharing.id
                ? {
                    id: noteUpdated.patch.sharing.id,
                  }
                : null,
            },
          });
        }

        // CollabText
        noteUpdated.patch.textFields?.forEach(({ value }) => {
          const { id: collabTextId, newRecord } = value;
          if (!newRecord) return;

          // Update cache with new record
          customApolloClient.writeFragmentNoRetain({
            id: customApolloClient.cache.identify({
              id: collabTextId,
              __typename: 'CollabText',
            }),
            fragment: FRAGMENT_COLLABTEXT,
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
