import { getOperationName } from '@apollo/client/utilities';

import { Note, ShareNoteMutationVariables } from '../../__generated__/graphql';
import { useIsExecutingOperation } from '../../graphql/hooks/useIsExecutingOperation';
import { useUserId } from '../../user/context/user-id';
import { ShareNote } from '../mutations/ShareNote';

export function useIsCreatingShareLink(noteId: Note['id']) {
  const userId = useUserId();

  return useIsExecutingOperation<ShareNoteMutationVariables>(
    getOperationName(ShareNote.document),
    {
      input: {
        authUser: {
          id: userId,
        },
        note: {
          id: noteId,
        },
        readOnly: false,
      },
    }
  );
}
