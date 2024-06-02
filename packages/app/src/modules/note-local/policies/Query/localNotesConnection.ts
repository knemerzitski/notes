import { ApolloCache, FieldPolicy, NormalizedCacheObject } from '@apollo/client';
import { EvictFieldPolicy } from '../../../apollo-client/policy/evict';
import { relayStylePagination } from '@apollo/client/utilities';
import { gql } from '../../../../__generated__/gql';
import { InsertLocalNoteToNotesConnectionQuery } from '../../../../__generated__/graphql';

const QUERY = gql(`
  query InsertLocalNoteToNotesConnection {
    localNotesConnection {
      edges {
        cursor
        node {
          id
          __typename
          textFields {
            key
            value {
              id
              __typename
            }
          }
        }
      }
    }
  }
`);

export const localNotesConnection: FieldPolicy & EvictFieldPolicy<NormalizedCacheObject> =
  relayStylePagination();

type LocalNotesConnectionNote = NonNullable<
  InsertLocalNoteToNotesConnectionQuery['localNotesConnection']['edges'][0]['node']
>;

export function insertLocalNoteToNotesConnection<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  note: LocalNotesConnectionNote
) {
  cache.updateQuery(
    {
      query: QUERY,
    },
    (data) => {
      if (!data) {
        return {
          localNotesConnection: {
            edges: [
              {
                cursor: note.id,
                node: note,
              },
            ],
          },
        };
      }

      if (data.localNotesConnection.edges.some(({ node }) => node.id === note.id)) {
        return;
      }

      return {
        ...data,
        localNotesConnection: {
          ...data.localNotesConnection,
          edges: [
            ...data.localNotesConnection.edges,
            {
              cursor: note.id,
              node: note,
            },
          ],
        },
      };
    }
  );
}
