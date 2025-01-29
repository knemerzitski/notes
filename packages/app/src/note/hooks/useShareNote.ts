import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { UserNoteLinkByInput } from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_sharing } from '../../graphql/utils/serialization-key';
import { ShareNote } from '../mutations/ShareNote';
import { parseUserNoteLinkByInput } from '../utils/id';

export function useShareNote() {
  const client = useApolloClient();
  const [shareNoteMutation] = useMutation(ShareNote);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      return shareNoteMutation({
        variables: {
          input: {
            authUser: {
              id: userId,
            },
            note: {
              id: noteId,
            },
            readOnly: false,
          },
        },
        errorPolicy: 'all',
        context: {
          serializationKey: noteSerializationKey_sharing(userId),
        },
      });
    },
    [shareNoteMutation, client]
  );
}
