import { ApolloCache } from '@apollo/client';

import { getFragmentData, gql } from '../../../__generated__';
import {
  GetCollabTextRecordsQueryQueryVariables,
  MapRecordCollabTextRecordFragmentFragmentDoc,
  Note,
} from '../../../__generated__/graphql';

const GetCollabTextRecords_Query = gql(`
  query GetCollabTextRecords_Query(
      $id: ObjectID!, 
      $after: NonNegativeInt, $first: PositiveInt,
      $before: NonNegativeInt, $last: PositiveInt
    ) {
    note(by: { id: $id }) {
      id
      collabText {
        id
        recordConnection(after: $after, first: $first, before: $before, last: $last) {
          edges {
            node {
              ...MapRecord_CollabTextRecordFragment
            }
          }
        }
      }
    }
  }
`);

export function getCollabTextRecords(
  noteId: Note['id'],
  variables: Omit<GetCollabTextRecordsQueryQueryVariables, 'id'>,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: GetCollabTextRecords_Query,
    variables: {
      ...variables,
      id: noteId,
    },
  });

  if (!data) {
    return null;
  }

  const edges = data.note.collabText.recordConnection.edges;

  return edges.map((edge) =>
    getFragmentData(MapRecordCollabTextRecordFragmentFragmentDoc, edge.node)
  );
}
