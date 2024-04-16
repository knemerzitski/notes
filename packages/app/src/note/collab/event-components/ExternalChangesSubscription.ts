import { useMemo } from 'react';

import { gql } from '../../../__generated__/gql';
import useHandleExternalChanges from '../../../collab/hooks/useHandleExternalChanges';
import { useSuspenseNoteEditors } from '../context/NoteEditorsProvider';
import { useNoteId } from '../context/NoteIdProvider';

const SUBSCRIPTION = gql(`
  subscription NoteExternalChange($input: NoteUpdatedInput!) {
    noteUpdated(input: $input) {
      id
      patch {
        textFields {
          key
          value {
            newRecord {
              change {
                revision
                changeset
              }
            }
          }
        }
      }
    }
  }
`);

export default function ExternalChangesSubscription() {
  const noteId = useNoteId();
  const editors = useSuspenseNoteEditors();

  const options = useMemo(
    () => ({
      query: SUBSCRIPTION,
      variables: {
        input: {
          id: noteId,
        },
      },
    }),
    [noteId]
  );

  useHandleExternalChanges({
    editors,
    options,
    mapData(data) {
      return data.noteUpdated.patch.textFields;
    },
  });

  return null;
}
