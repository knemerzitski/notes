import { useApolloClient } from '@apollo/client';

import { useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useLogger } from '../../utils/context/logger';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { getCollabTextRecords } from '../models/record-connection/get';
import { getCollabTextAt } from '../models/record-connection/text-at';

const HistoryRestoration_Query = gql(`
  query HistoryRestoration_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $before: NonNegativeInt!, $last: PositiveInt!){
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        historyTailRevision
      }
      note(by: $noteBy) {
        id
        collabText {
          id
          recordConnection(before: $before, last: $last) {
            edges {
              node {
                ...MapRecord_CollabTextRecordFragment
              }
            }
            pageInfo {
              hasPreviousPage
            }
          }
        }
      }
    }
  }
`);

const HistoryRestorationHasPreviousPage_Query = gql(`
  query HistoryRestorationHasPreviousPage_Query($userBy: UserByInput!, $noteBy: NoteByInput!){
    signedInUser(by: $userBy) {
      id
      note(by: $noteBy) {
        id
        collabText {
          id
          recordConnection {
            pageInfo {
              hasPreviousPage
            }
          }
        }
      }
    }
  }
`);

export function HistoryRestoration(props: Parameters<typeof HaveMoreRecords>[0]) {
  const noteId = useNoteId();
  const userId = useUserId();
  const client = useApolloClient();

  const data = client.readQuery({
    query: HistoryRestorationHasPreviousPage_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  if (
    data?.signedInUser.note.collabText.recordConnection.pageInfo.hasPreviousPage === false
  ) {
    return null;
  }

  return <HaveMoreRecords {...props} />;
}

function HaveMoreRecords({
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
  const logger = useLogger('HistoryRestoration');
  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();
  const collabService = useCollabService();

  const isFetchingRef = useRef(false);
  const haveReachedTailRef = useRef(false);

  useEffect(() => {
    async function attemptFetchMore() {
      if (isFetchingRef.current || haveReachedTailRef.current) {
        return;
      }

      const historyTailServerRevision = collabService.historyTailServerRevision;
      if (!historyTailServerRevision) {
        logger?.debug('noHistoryTailServerRevision');
        return;
      }

      let historyEntriesRemaining = 0;
      const records = getCollabTextRecords(
        noteId,
        {
          before: historyTailServerRevision + 1,
        },
        client.cache
      );
      if (records) {
        for (let i = records.length - 1; i >= 0; i--) {
          const record = records[i];
          if (!record) {
            continue;
          }

          if (record.author.id === userId) {
            historyEntriesRemaining++;
            if (historyEntriesRemaining > triggerEntriesRemaining) {
              logger?.debug('haveEnoughEntries');
              return;
            }
          }
        }
      }

      isFetchingRef.current = true;
      try {
        const recordsBeforeRevision = historyTailServerRevision + 1;
        const minRecordsAfterRevision = Math.max(
          0,
          recordsBeforeRevision - fetchEntriesCount - 1
        );

        const availableRecords = getCollabTextRecords(
          noteId,
          {
            after: minRecordsAfterRevision,
          },
          client.cache
        );

        const newestCachedRevision =
          availableRecords?.[availableRecords.length - 1]?.revision;
        const recordsLast = Math.min(
          fetchEntriesCount,
          Math.max(
            0,
            recordsBeforeRevision - (newestCachedRevision ?? minRecordsAfterRevision) - 1
          )
        );

        const tailRevision = Math.max(0, recordsBeforeRevision - recordsLast - 1);
        // First revision is 1, so recordsLast must be > 1 to fetch
        const skipRecords = recordsLast <= 1;
        if (skipRecords) {
          logger?.debug('skip');
          return;
        }

        logger?.debug('fetchParams', {
          historyTailServerRevision,
          historyEntriesRemaining,
          fetchEntriesCount,
          triggerEntriesRemaining,
          minRecordsAfterRevision,
          newestCachedRevision,
          recordsBeforeRevision,
          recordsLast,
          collabTextAt: getCollabTextAt(noteId, tailRevision, client.cache),
        });

        const { data } = await client.query({
          query: HistoryRestoration_Query,
          variables: {
            userBy: {
              id: userId,
            },
            noteBy: {
              id: noteId,
            },
            before: recordsBeforeRevision,
            last: recordsLast,
          },
          fetchPolicy: 'network-only',
        });

        if (
          recordsBeforeRevision - recordsLast <=
          data.signedInUser.noteLink.historyTailRevision
        ) {
          haveReachedTailRef.current = true;
        }

        // Cache update will emit 'records:update' event from CacheRecordsFacade
        // Event flow: Cache update => CacheRecordsFacade => CollabService

        void attemptFetchMore();
      } finally {
        isFetchingRef.current = false;
      }
    }

    void attemptFetchMore();

    return collabService.on(['undo:applied', 'headRecord:reset'], () => {
      void attemptFetchMore();
    });
  }, [
    client,
    noteId,
    userId,
    collabService,
    fetchEntriesCount,
    triggerEntriesRemaining,
    logger,
  ]);

  return null;
}
