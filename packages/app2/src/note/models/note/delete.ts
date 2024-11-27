import { ApolloCache } from '@apollo/client';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { removeNoteFromConnection } from '../note-connection/remove';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';
import { setNotePendingStatus } from '../local-note/set-status';
import { removeUnsavedNote } from '../unsaved-notes/remove';

export function deleteNote(
  by: UserNoteLinkByInput,
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'writeQuery' | 'identify' | 'gc' | 'evict'
  >
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  removeNoteFromConnection(
    {
      userNoteLinkId,
    },
    cache
  );
  setNotePendingStatus(by, null, cache);
  removeUnsavedNote(by, cache);

  cache.evict({
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });

  cache.gc();
}
