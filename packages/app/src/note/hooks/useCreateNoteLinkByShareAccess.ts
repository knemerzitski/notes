import { useCallback } from 'react';

import { NoteShareAccess } from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { CreateNoteLinkByShareAccess } from '../mutations/CreateNoteLinkByShareAccess';

export function useCreateNoteLinkByShareAccess() {
  const [createNoteLinkByShareAccessMutation] = useMutation(CreateNoteLinkByShareAccess);

  return useCallback(
    (shareId: NoteShareAccess['id']) => {
      return createNoteLinkByShareAccessMutation({
        variables: {
          input: {
            shareAccessId: shareId,
          },
        },
        errorPolicy: 'all',
      });
    },
    [createNoteLinkByShareAccessMutation]
  );
}
