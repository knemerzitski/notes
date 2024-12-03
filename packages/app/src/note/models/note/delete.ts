import { ApolloCache } from '@apollo/client';

import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { cacheGc } from '../../../graphql/utils/cache-gc';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';
import { setNotePendingStatus } from '../local-note/set-status';
import { removeNoteFromConnection } from '../note-connection/remove';
import { updateUnsavedCollabService } from '../update-unsaved-collab-service';

export function deleteNote(
  by: UserNoteLinkByInput,
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'writeQuery' | 'identify' | 'gc' | 'evict' | 'modify'
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
  updateUnsavedCollabService(by, true, cache);

  cache.evict({
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });

  cacheGc(cache);
}
