import { useApolloClient } from '@apollo/client';

import { useEffect } from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { MapRecordCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { cacheRecordToCollabServiceRecord } from '../utils/map-record';
import { useUserId } from '../../user/context/user-id';

const SyncMissingRecords_Query = gql(`
  query SyncMissingRecords_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!, $after: NonNegativeInt!, $first: PositiveInt!) {
    signedInUser(by: $userBy) {
      id
      note(by: $noteBy) {
        id
        collabText {
          id
          recordConnection(after: $after, first: $first) {
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

// TODO write tests
/**
 * Fetch missing records according to CollabService event `missingRevisions`.
 * Might miss records during short network outage and then suddenly receive
 * an external change with higher revision.
 */
export function SyncMissingRecords({
  fetchDelay = 200,
}: {
  /**
   * Delay in milliseconds before fetching missing records
   * @default 200
   */
  fetchDelay?: number;
}) {
  const client = useApolloClient();
  const userId = useUserId();
  const noteId = useNoteId();
  const collabService = useCollabService();

  useEffect(() => {
    let fetching = false;
    async function fetchMissingRecords(depth = 0) {
      if (depth > 20) {
        throw new Error(
          'Attempted to fetch missing records 20 times recursively. Stopping!'
        );
      }

      if (fetching) return;

      try {
        fetching = true;

        const initialMissingRevisions = collabService.getMissingRevisions();
        if (!initialMissingRevisions) return;

        if (fetchDelay > 0) {
          await new Promise((res) => {
            setTimeout(res, fetchDelay);
          });
        }

        const missingRevisions = collabService.getMissingRevisions();
        if (!missingRevisions) return;

        const { start, end } = missingRevisions;

        await client
          .query({
            query: SyncMissingRecords_Query,
            variables: {
              userBy: {
                id: userId,
              },
              noteBy: {
                id: noteId,
              },
              after: start - 1,
              first: end - start + 1,
            },
          })
          .then(({ data }) => {
            data.signedInUser.note.collabText.recordConnection.edges.forEach((edge) => {
              const record = getFragmentData(
                MapRecordCollabTextRecordFragmentFragmentDoc,
                edge.node
              );

              collabService.handleExternalChange(
                cacheRecordToCollabServiceRecord(record)
              );
            });
          });
      } finally {
        fetching = false;
      }

      void fetchMissingRecords(depth + 1);
    }

    const missingRevisions = collabService.getMissingRevisions();
    if (missingRevisions) {
      void fetchMissingRecords();
    }

    return collabService.eventBus.on('missingRevisions', () => {
      void fetchMissingRecords();
    });
  }, [client, userId, noteId, collabService, fetchDelay]);

  return null;
}
