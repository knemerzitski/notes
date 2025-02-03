import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { MapRecordCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { cacheRecordToCollabServiceRecord } from '../utils/map-record';

const SyncHeadTextWatch_Query = gql(`
  query SyncHeadTextWatch_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      collabService
      collabText {
        id
        headText {
          revision
          changeset
        }
      }
    }
  }
`);

const SyncHeadText_Query = gql(`
  query SyncHeadText_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $after: NonNegativeInt!, $first: PositiveInt!) {
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
 * Watch for collabText.headText changes.
 * If CollabService headRevision doesn't match cached headText do following:
 * - Have local/submitted changes: Query for missing records and process them as external changes
 * - No changes: replace CollabService headText
 */
export function SyncHeadText() {
  const client = useApolloClient();
  const userId = useUserId();
  const noteId = useNoteId();

  useEffect(() => {
    const observable = client.watchQuery({
      query: SyncHeadTextWatch_Query,
      variables: {
        by: {
          id: noteId,
        },
      },
      fetchPolicy: 'cache-only',
    });

    const sub = observable.subscribe((value) => {
      if (value.partial) {
        return;
      }

      const note = value.data.note;
      const collabText = note.collabText;
      const collabService = note.collabService;

      const cacheHeadRevision = collabText.headText.revision;

      const collabServiceIsOutdated = collabService.headRevision < cacheHeadRevision;
      if (collabServiceIsOutdated) {
        if (collabService.haveChanges()) {
          // Have local or submitted changes, query for required records and process them as external changes
          void client
            .query({
              query: SyncHeadText_Query,
              variables: {
                userBy: {
                  id: userId,
                },
                noteBy: {
                  id: noteId,
                },
                after: collabService.headRevision,
                first: cacheHeadRevision - collabService.headRevision,
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
        } else {
          // No changes, can safely replace headText
          collabService.replaceHeadText(collabText.headText);
        }
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, userId, noteId]);

  return null;
}
