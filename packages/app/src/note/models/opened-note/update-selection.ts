import { ApolloCache } from '@apollo/client';

import { gql, makeFragmentData } from '../../../__generated__';
import {
  UserNoteLink,
  UpdateOpenNoteSelectionRangeInput,
  UpdateOpenNoteSelectionRangePayloadUserNoteLinkFragmentFragmentDoc,
} from '../../../__generated__/graphql';

const UpdateOpenNoteSelectionRange_UserNoteLinkFragment = gql(`
   fragment UpdateOpenNoteSelectionRange_UserNoteLinkFragment on UserNoteLink {
    ...UpdateOpenNoteSelectionRangePayload_UserNoteLinkFragment
   }
`);

export function updateOpenNoteSelectionRange(
  id: UserNoteLink['id'],
  input: Omit<UpdateOpenNoteSelectionRangeInput, 'note' | 'authUser'>,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: UpdateOpenNoteSelectionRange_UserNoteLinkFragment,
    fragmentName: 'UpdateOpenNoteSelectionRange_UserNoteLinkFragment',
    data: {
      __typename: 'UserNoteLink',
      ...makeFragmentData(
        {
          __typename: 'UserNoteLink',
          id,
          open: {
            __typename: 'OpenedNote',
            collabTextEditing: {
              __typename: 'CollabTextEditing',
              revision: input.revision,
              latestSelection: input.selection,
            },
          },
        },
        UpdateOpenNoteSelectionRangePayloadUserNoteLinkFragmentFragmentDoc
      ),
    },
  });
}
