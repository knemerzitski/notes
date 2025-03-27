import { ApolloCache } from '@apollo/client';

import { UserNoteLink } from '../../../__generated__/graphql';
import { cacheGc } from '../../../graphql/utils/cache-gc';
import { setNotePendingStatus } from '../local-note/set-status';
import { removeNoteFromConnection } from '../note-connection/remove';
import { updateUnsavedCollabService } from '../update-unsaved-collab-service';

import { removeUserFromNote } from './remove-user';

export function deleteNote(
  userNoteLinkId: UserNoteLink['id'],
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'writeQuery' | 'identify' | 'gc' | 'evict' | 'modify'
  >
) {
  // Manually removing user from note to not leave a
  // dangling reference as evict and gc will make userLink unreachable
  removeUserFromNote(userNoteLinkId, cache);

  removeNoteFromConnection(
    {
      userNoteLinkId,
    },
    cache
  );
  setNotePendingStatus(
    {
      userNoteLinkId,
    },
    null,
    cache
  );
  updateUnsavedCollabService(
    {
      userNoteLinkId,
    },
    true,
    cache
  );

  cache.evict({
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });

  cacheGc(cache);
}
