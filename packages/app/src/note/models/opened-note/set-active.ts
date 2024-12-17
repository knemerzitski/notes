import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { PublicUserNoteLink } from '../../../__generated__/graphql';

const SetOpenedNoteActive_PublicUserNoteLinkFragment = gql(`
   fragment SetOpenedNoteActive_PublicUserNoteLinkFragment on PublicUserNoteLink {
    id
     open {
      active
     }
   }
`);

export function setOpenedNoteActive(
  id: PublicUserNoteLink['id'],
  active: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: SetOpenedNoteActive_PublicUserNoteLinkFragment,
    data: {
      __typename: 'PublicUserNoteLink',
      id,
      open: {
        __typename: 'OpenedNote',
        active,
      },
    },
  });
}
