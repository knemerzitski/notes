import { useApolloClient } from '@apollo/client';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useEffect, useRef } from 'react';
import { CacheRecordsFacade } from '../utils/cache-records-facade';
import { UserRecords } from '~collab/client/user-records';
import { useUserId } from '../../user/context/user-id';
import { gql } from '../../__generated__';

const HistoryRestoration_Query = gql(`
  query HistoryRestoration_Query($by: UserNoteLinkByInput!, 
                            $recordsBeforeRevision: NonNegativeInt!, $recordsLast: PositiveInt!, $skipRecords: Boolean!
                            $tailRevision: NonNegativeInt! $skipTailRevision: Boolean!, ){
    userNoteLink(by: $by) {
      id
      note {
        id
        collabText {
          id
          textAtRevision(revision: $tailRevision) @skip(if: $skipTailRevision) {
            revision
            changeset
          }
          recordConnection(before: $recordsBeforeRevision, last: $recordsLast) @skip(if: $skipRecords) {
            edges {
              node {
                ...MapRecord_CollabTextRecordFragment
              }
            }
          }
        }
      }
    }
  }
`);

export function HistoryRestoration({
  fetchEntriesCount = 20,
  triggerEntriesRemaining = 10,
}: {
  /**
   * Amount of entries to fetch in one go.
   * @default 20
   */
  fetchEntriesCount?: number;
  /**
   * Fetch more entries when n-amount of entries are left in history that can be undo.
   * @default 10
   */
  triggerEntriesRemaining?: number;
}) {
  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();
  const collabService = useCollabService();

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const cacheRecordsFacade = new CacheRecordsFacade({
      cache: client.cache,
      noteId,
      initialTailText: collabService.headText,
    });

    const userRecords = new UserRecords({
      userId,
      serverRecords: cacheRecordsFacade,
    });
    collabService.userRecords = userRecords;

    async function attemptFetchMore() {
      if (isFetchingRef.current) {
        return;
      }

      const historyEntriesRemaining = collabService.history.localIndex + 1;
      const requiredEntriesInCacheCount =
        triggerEntriesRemaining - historyEntriesRemaining + 1;

      const haveEnoughEntries = userRecords.hasOwnOlderRecords(
        collabService.history.tailRevision,
        requiredEntriesInCacheCount
      );

      if (haveEnoughEntries) {
        return;
      }

      isFetchingRef.current = true;
      try {
        const recordsBeforeRevision = collabService.history.tailRevision + 1;
        const minRecordsAfterRevision = Math.max(
          0,
          recordsBeforeRevision - fetchEntriesCount - 1
        );

        const availableRecords = cacheRecordsFacade.readRecords({
          after: minRecordsAfterRevision,
        });
        const newestCachedRevision =
          availableRecords[availableRecords.length - 1]?.change.revision;
        const recordsLast = Math.min(
          fetchEntriesCount,
          Math.max(
            0,
            recordsBeforeRevision - (newestCachedRevision ?? minRecordsAfterRevision) - 1
          )
        );

        const tailRevision = Math.max(0, recordsBeforeRevision - recordsLast - 1);
        const skipTailRevision =
          tailRevision <= 0 || cacheRecordsFacade.hasTextAt(tailRevision);
        // First revision is 1, so recordsLast must be > 1 to fetch
        const skipRecords = recordsLast <= 1;

        if (skipRecords && skipTailRevision) {
          return;
        }

        await client.query({
          query: HistoryRestoration_Query,
          variables: {
            by: {
              noteId,
            },
            recordsBeforeRevision,
            recordsLast: skipRecords ? 1 : recordsLast,
            tailRevision,
            skipTailRevision,
            skipRecords,
          },
          fetchPolicy: 'network-only',
        });

        // Cache update will emit 'userRecordsUpdated' event from CacheRecordsFacade
        // Event flow: Cache update => CacheRecordsFacade => UserRecords => CollabService

        void attemptFetchMore();
      } finally {
        isFetchingRef.current = false;
      }
    }

    const eventsOff = collabService.eventBus.on(
      ['appliedUndo', 'replacedHeadText'],
      () => {
        void attemptFetchMore();
      }
    );

    void attemptFetchMore();

    return () => {
      cacheRecordsFacade.cleanUp();
      userRecords.cleanUp();
      eventsOff();
      if (collabService.userRecords === userRecords) {
        collabService.userRecords = null;
      }
    };
  }, [client, noteId, userId, collabService, fetchEntriesCount, triggerEntriesRemaining]);

  return null;
}