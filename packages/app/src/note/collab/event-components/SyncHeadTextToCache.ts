import { useApolloClient } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import useSyncHeadTextToCache from '../../../collab/hooks/useSyncHeadTextToCache';
import { useSuspenseNoteEditors } from '../context/NoteEditorsProvider';
import { useNoteId } from '../context/NoteIdProvider';

export const FRAGMENT = gql(`
  fragment NoteSyncHeadTextToCache on Note {
    textFields {
      key
      value {
        headText
        headRevision
      }
    }
  }
`);

export default function SyncHeadTextToCache() {
  const client = useApolloClient();
  const noteId = useNoteId();
  const editors = useSuspenseNoteEditors();

  useSyncHeadTextToCache({
    editors,
    id: client.cache.identify({ id: noteId, __typename: 'Note' }),
    fragment: FRAGMENT,
    mapData({ key, value }) {
      return {
        textFields: [
          {
            key,
            value,
          },
        ],
      };
    },
  });

  return null;
}
