import { getOperationName } from '@apollo/client/utilities';

import { Note, ShareNoteMutationVariables } from '../../__generated__/graphql';
import { useIsExecutingOperation } from '../../graphql/hooks/useIsExecutingOperation';
import { ShareNote } from '../mutations/ShareNote';

export function useIsCreatingShareLink(noteId: Note['id']) {
  return useIsExecutingOperation<ShareNoteMutationVariables>(
    getOperationName(ShareNote.document),
    {
      input: {
        noteId,
        readOnly: false,
      },
    }
  );
}
