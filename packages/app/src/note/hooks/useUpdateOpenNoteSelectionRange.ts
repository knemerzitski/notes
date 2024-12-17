import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';


import { makeFragmentData } from '../../__generated__';
import {
  UpdateOpenNoteSelectionRangeInput,
  UpdateOpenNoteSelectionRangePayloadFragmentDoc,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { useUserId } from '../../user/context/user-id';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import { UpdateOpenNoteSelectionRange } from '../mutations/UpdateOpenNoteSelectionRange';
import { getUserNoteLinkId } from '../utils/id';

// TODO prevent/queue if sub is not running...

export function useUpdateOpenNoteSelectionRange() {
  const client = useApolloClient();
  const [updateOpenNoteSelectionRangeMutation] = useMutation(
    UpdateOpenNoteSelectionRange
  );
  const userId = useUserId();

  // first check if sub is running and not expired
  // prevent if less then 1 sec left

  return useCallback(
    (input: UpdateOpenNoteSelectionRangeInput) => {
      const noteId = input.noteId;

      return updateOpenNoteSelectionRangeMutation({
        local: isLocalOnlyNote({ noteId }, client.cache),
        variables: {
          input,
        },
        errorPolicy: 'all',
        optimisticResponse: {
          __typename: 'Mutation',
          updateOpenNoteSelectionRange: {
            __typename: 'UpdateOpenNoteSelectionRangePayload',
            ...makeFragmentData(
              {
                __typename: 'UpdateOpenNoteSelectionRangePayload',
                publicUserNoteLink: {
                  __typename: 'PublicUserNoteLink',
                  id: getUserNoteLinkId(noteId, userId),
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
              },
              UpdateOpenNoteSelectionRangePayloadFragmentDoc
            ),
          },
        },
      });
    },
    [updateOpenNoteSelectionRangeMutation, client, userId]
  );
}