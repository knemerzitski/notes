import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { getFragmentData } from '../../../../src/__generated__';
import { CreateNoteLinkByShareAccessPayloadFragmentDoc } from '../../../../src/__generated__/graphql';
import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { GraphQLService } from '../../../../src/graphql/types';
import { useCreateNoteLinkByShareAccess } from '../../../../src/note/hooks/useCreateNoteLinkByShareAccess';
import { UserIdProvider } from '../../../../src/user/context/user-id';

export async function createNoteLinkByShareAccess({
  graphQLService,
  userId,
  shareAccessId,
}: {
  graphQLService: GraphQLService;
  userId: string;
  shareAccessId: string;
}) {
  const {
    result: { current: createNoteLinkByShareAccess },
  } = renderHook(() => useCreateNoteLinkByShareAccess(), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <GraphQLServiceProvider service={graphQLService}>
          <UserIdProvider userId={userId}>{children}</UserIdProvider>
        </GraphQLServiceProvider>
      );
    },
  });

  const { data } = await createNoteLinkByShareAccess(shareAccessId);

  if (!data) {
    throw new Error('createNoteLinkByShareAccess: no response data');
  }

  const payload = getFragmentData(
    CreateNoteLinkByShareAccessPayloadFragmentDoc,
    data.createNoteLinkByShareAccess
  );

  return {
    noteId: payload.userNoteLink.note.id,
  };
}
