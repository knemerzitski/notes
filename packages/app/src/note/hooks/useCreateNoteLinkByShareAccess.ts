import { useCallback } from 'react';

import { NoteShareAccess } from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { useUserId } from '../../user/context/user-id';
import { CreateNoteLinkByShareAccess } from '../mutations/CreateNoteLinkByShareAccess';

export function useCreateNoteLinkByShareAccess() {
  const userId = useUserId();

  const [createNoteLinkByShareAccessMutation] = useMutation(CreateNoteLinkByShareAccess);

  return useCallback(
    (shareId: NoteShareAccess['id']) => {
      return createNoteLinkByShareAccessMutation({
        variables: {
          input: {
            authUser: {
              id: userId,
            },
            shareAccessId: shareId,
          },
        },
        errorPolicy: 'all',
      });
    },
    [createNoteLinkByShareAccessMutation, userId]
  );
}
