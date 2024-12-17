import { ApolloCache } from '@apollo/client';
import { gql, makeFragmentData } from '../../../__generated__';
import {
  PublicUserNoteLink,
  UpdateOpenNoteSelectionRangeInput,
  UpdateOpenNoteSelectionRangePayloadPublicUserNoteLinkFragmentFragmentDoc,
} from '../../../__generated__/graphql';

const UpdateOpenNoteSelectionRange_PublicUserNoteLinkFragment = gql(`
   fragment UpdateOpenNoteSelectionRange_PublicUserNoteLinkFragment on PublicUserNoteLink {
    ...UpdateOpenNoteSelectionRangePayload_PublicUserNoteLinkFragment
   }
`);

export function updateOpenNoteSelectionRange(
  id: PublicUserNoteLink['id'],
  input: Omit<UpdateOpenNoteSelectionRangeInput, 'noteId'>,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: UpdateOpenNoteSelectionRange_PublicUserNoteLinkFragment,
    fragmentName: 'UpdateOpenNoteSelectionRange_PublicUserNoteLinkFragment',
    data: {
      __typename: 'PublicUserNoteLink',
      ...makeFragmentData(
        {
          __typename: 'PublicUserNoteLink',
          id,
          open: {
            __typename: 'OpenedNote',
            collabTextEditing: {
              __typename: 'CollabTextEditing',
              revision: input.revision,
              latestSelection: {
                __typename: 'CollabTextSelectionRange',
                start: input.selectionRange.start,
                end: input.selectionRange.end,
              },
            },
          },
        },
        UpdateOpenNoteSelectionRangePayloadPublicUserNoteLinkFragmentFragmentDoc
      ),
    },
  });
}
