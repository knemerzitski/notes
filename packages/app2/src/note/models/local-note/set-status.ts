import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { NoteCreateStatus, UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';

const SetNoteCreateStatus_Query = gql(`
  query SetNoteCreateStatus_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      createStatus
    }
  }
`);

export function setNoteCreateStatus(
  by: UserNoteLinkByInput,
  createStatus: NoteCreateStatus,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readQuery'>
) {
  return cache.writeQuery({
    query: SetNoteCreateStatus_Query,
    variables: {
      by,
    },
    data: {
      __typename: 'Query',
      userNoteLink: {
        __typename: 'UserNoteLink',
        id: getUserNoteLinkIdFromByInput(by, cache),
        createStatus,
      },
    },
  });
}
