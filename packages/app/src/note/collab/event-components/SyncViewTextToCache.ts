import { useApolloClient } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import useSyncViewTextToCache from '../../../collab/hooks/useSyncViewTextToCache';
import { useSuspenseNoteEditors } from '../context/NoteEditorsProvider';
import { useNoteId } from '../context/NoteIdProvider';


export const FRAGMENT = gql(`
  fragment NoteSyncViewTextToCache on Note {
    textFields {
      key 
      value {
        viewText
      }
    }
  }
`);

export default function SyncViewTextToCache() {
  const client = useApolloClient();
  const noteId = useNoteId();
  const editors = useSuspenseNoteEditors();

  useSyncViewTextToCache({
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
