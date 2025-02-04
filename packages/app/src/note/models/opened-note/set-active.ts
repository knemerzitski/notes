import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLink } from '../../../__generated__/graphql';

const SetOpenedNoteActive_UserNoteLinkFragment = gql(`
   fragment SetOpenedNoteActive_UserNoteLinkFragment on UserNoteLink {
    id
     open {
      active
     }
   }
`);

export function setOpenedNoteActive(
  id: UserNoteLink['id'],
  active: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: SetOpenedNoteActive_UserNoteLinkFragment,
    data: {
      __typename: 'UserNoteLink',
      id,
      open: {
        __typename: 'OpenedNote',
        active,
      },
    },
  });
}
