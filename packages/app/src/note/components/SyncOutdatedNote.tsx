import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useUserId } from '../../user/context/user-id';
import { useEffect, useRef } from 'react';
import { handleNoteError } from '../utils/handle-error';
import { getConnectionCategoryName } from '../models/note/connection-category-name';
import { getUserNoteLinkId } from '../utils/id';
import { moveNoteInConnection } from '../models/note-connection/move';
import { useLogger } from '../../utils/context/logger';
import { updateUserNoteLinkOutdated } from '../models/note/outdated';
import { getCategoryName } from '../models/note/category-name';

const SyncOutdatedNote_WatchQuery = gql(`
  query SyncOutdatedNote_WatchQuery($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        outdated
      }
    }
  }
`);

const SyncOutdatedNote_Query = gql(`
  query SyncOutdatedNote_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }
    }
  }
`);

/**
 * Watched if note is outdated.
 * If note is outdated, a query is sent to server
 * - Deletes note if server returns `Note note found` error
 * - Moves note to correct category if category has changed
 */
export function SyncOutdatedNote() {
  const noteId = useNoteId();
  const userId = useUserId();

  const { data } = useQuery(SyncOutdatedNote_WatchQuery, {
    variables: {
      noteBy: {
        id: noteId,
      },
      userBy: {
        id: userId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  if (!data.signedInUser.noteLink.outdated) {
    return;
  }

  return <OutdatedSubscription />;
}

function OutdatedSubscription() {
  const logger = useLogger('SyncOutdatedNote');

  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();

  const isQueringRef = useRef(false);

  useEffect(() => {
    const variables = {
      noteBy: {
        id: noteId,
      },
      userBy: {
        id: userId,
      },
    };

    const observable = client.watchQuery({
      query: SyncOutdatedNote_WatchQuery,
      variables,
      fetchPolicy: 'cache-only',
    });

    async function syncNoteWithServer(): Promise<void> {
      if (isQueringRef.current) {
        return;
      }

      isQueringRef.current = true;
      try {
        logger?.debug('syncing', noteId);
        const userNoteLinkId = getUserNoteLinkId(noteId, userId);

        const cachedCategoryName =
          getConnectionCategoryName(
            {
              userNoteLinkId,
            },
            client.cache
          ) ??
          getCategoryName(
            {
              userNoteLinkId,
            },
            client.cache
          );

        const { data, errors } = await client.query({
          query: SyncOutdatedNote_Query,
          fetchPolicy: 'network-only',
          variables,
          context: {
            // Don't display `Note not found` to user
            skipAddUserMessageOnError: true,
          },
          errorPolicy: 'all',
        });

        // Remove outdated flag so note isn't queried repeatedly
        updateUserNoteLinkOutdated(userNoteLinkId, false, client.cache);

        if (errors) {
          // Note might be deleted
          if (handleNoteError(userId, noteId, client.cache, errors)) {
            logger?.debug('isDeleted', { noteId });
            return;
          }
          return;
        }

        const serverCategoryName = data.signedInUser.noteLink.categoryName;

        // Move note to correct category
        const latestConnectionCategoryName = getConnectionCategoryName(
          {
            userNoteLinkId,
          },
          client.cache
        );
        const isNoteStillInIncorrectCategory =
          latestConnectionCategoryName == null ||
          serverCategoryName !== latestConnectionCategoryName;
        if (serverCategoryName !== cachedCategoryName && isNoteStillInIncorrectCategory) {
          logger?.debug('moving', { noteId, cachedCategoryName, serverCategoryName });
          moveNoteInConnection(
            {
              userNoteLinkId,
            },
            {
              categoryName: serverCategoryName,
            },
            client.cache
          );
        }
      } finally {
        isQueringRef.current = false;
      }
    }

    const sub = observable.subscribe((value) => {
      if (value.partial) {
        return;
      }

      const isOutdated = value.data.signedInUser.noteLink.outdated;
      if (isOutdated) {
        void syncNoteWithServer();
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, noteId, userId, logger]);

  return null;
}
