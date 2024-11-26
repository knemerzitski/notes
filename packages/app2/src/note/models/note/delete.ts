import { ApolloCache } from '@apollo/client';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { removeNoteFromConnection } from '../note-connection/remove';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';
import { removeCreateNote } from '../local-note/remove-create';
import { removeUnsavedNote } from '../unsaved-notes/remove';

export function deleteNote(
  by: UserNoteLinkByInput,
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'identify' | 'gc' | 'evict'
  >
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  removeNoteFromConnection(
    {
      userNoteLinkId,
    },
    cache
  );
  removeCreateNote(by, cache);
  removeUnsavedNote(by, cache);

  cache.evict({
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });

  cache.gc();
}
