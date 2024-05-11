import { useEffect } from 'react';

import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import getCollabEditor from '../../../collab/utils/getCollabEditor';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/utils/record-conversion';

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

interface ExternalChangesSubscriptionProps {
  /**
   * Subscribe to specific note updates. If unspecified then subscribes
   * to all notes of current user.
   */
  noteContentId?: string;
}

export default function ExternalChangesSubscription({
  noteContentId,
}: ExternalChangesSubscriptionProps) {
  const apolloClient = useApolloClient();

  useEffect(() => {
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

          const editor = getCollabEditor(apolloClient, collabTextId);
          if (!editor) return;
          editor.handleExternalChange(collabTextRecordToEditorRevisionRecord(newRecord));
        });
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, noteContentId]);

  return null;
}
