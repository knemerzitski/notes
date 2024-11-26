import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import {
  GetCategoryNameQueryQueryVariables,
  NoteCategory,
} from '../../../__generated__/graphql';

const GetCategoryName_Query = gql(`
  query GetCategoryName_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      categoryName
    }
  }
`);

export function getCategoryName(
  by: GetCategoryNameQueryQueryVariables['by'],
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): NoteCategory | undefined {
  const data = cache.readQuery({
    query: GetCategoryName_Query,
    variables: {
      by,
    },
  });

  return data?.userNoteLink.categoryName;
}
