import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { ComposedTextRecord, NoteByInput } from '../../../__generated__/graphql';

const GetHeadRecord_Query = gql(`
  query GetHeadRecord_Query($by: NoteByInput!) {
    note(by: $by){
      id
      collabText {
        id
        headRecord {
          revision
          text
        }
      }
    }
  }
`);

export function getHeadRecord(
  by: NoteByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): Pick<ComposedTextRecord, 'text' | 'revision'> | undefined {
  const data = cache.readQuery({
    query: GetHeadRecord_Query,
    variables: {
      by,
    },
  });

  return data?.note.collabText.headRecord;
}
