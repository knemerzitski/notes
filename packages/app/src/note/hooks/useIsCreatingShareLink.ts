import { getOperationName } from '@apollo/client/utilities';
import { useIsExecutingOperation } from '../../graphql/hooks/useIsExecutingOperation';
import { ShareNote } from '../mutations/ShareNote';
import { Note, ShareNoteMutationVariables } from '../../__generated__/graphql';

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
