import { useApolloClient, useQuery } from '@apollo/client';

import { useEffect } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { removeNoteFromConnection } from '../models/note-connection/remove';

const DeleteExpiredNotes_Query = gql(`
  query DeleteExpiredNotes_Query($userBy: SignedInUserByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: TRASH) {
        edges {
          node {
            id
            deletedAt
          }
        }
      }
    }
  }
`);

export function DeleteExpiredNotes({
  localOnly = false,
}: {
  /**
   * Delete expired notes only for local user
   * @default false
   */
  localOnly?: boolean;
}) {
  const client = useApolloClient();
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const userId = useUserId();

  const { data } = useQuery(DeleteExpiredNotes_Query, {
    variables: {
      userBy: {
        id: userId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  useEffect(() => {
    if (localOnly && !isLocalOnlyUser) {
      return;
    }

    const currentDate = new Date();

    data?.signedInUser.noteLinkConnection.edges.forEach((edge) => {
      const noteLink = edge.node;
      const deletedAt = noteLink.deletedAt;
      if (!deletedAt) {
        return;
      }

      if (deletedAt <= currentDate) {
        removeNoteFromConnection(
          {
            userNoteLinkId: noteLink.id,
          },
          client.cache
        );
      }
    });
  }, [data, localOnly, isLocalOnlyUser, client]);

  return null;
}
