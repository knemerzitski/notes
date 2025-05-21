import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLink } from '../../../__generated__/graphql';

const SetViewText_UserNoteLinkFragment = gql(`
  fragment SetViewText_UserNoteLinkFragment on UserNoteLink {
    id
    viewText
  }
`);

export function setViewText(
  id: UserNoteLink['id'],
  viewText: string,
  cache: Pick<ApolloCache<unknown>, 'writeFragment' | 'identify'>
) {
  cache.writeFragment({
    fragment: SetViewText_UserNoteLinkFragment,
    id: cache.identify({
      __typename: 'UserNoteLink',
      id,
    }),
    data: {
      __typename: 'UserNoteLink',
      id,
      viewText,
    },
  });
}
