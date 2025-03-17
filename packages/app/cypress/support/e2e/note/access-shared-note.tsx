/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { getFragmentData } from '../../../../src/__generated__';
import { CreateNoteLinkByShareAccessPayloadFragmentDoc } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';
import { UserIdProvider } from '../../../../src/user/context/user-id';
import { useCreateNoteLinkByShareAccess } from '../../../../src/note/hooks/useCreateNoteLinkByShareAccess';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      accessSharedNote: (
        options: AccessSharedNoteOptions
      ) => Chainable<AccessSharedNoteResult>;
    }
  }
}

interface AccessSharedNoteOptions {
  graphQLService: GraphQLService;
  userId: string;
  shareAccessId: string;
}

interface AccessSharedNoteResult {
  noteId: string;
}

Cypress.Commands.add(
  'accessSharedNote',
  ({ graphQLService, userId, shareAccessId }: AccessSharedNoteOptions) => {
    return cy.then(async () => {
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
        throw new Error('accessSharedNote: no response data');
      }

      const payload = getFragmentData(
        CreateNoteLinkByShareAccessPayloadFragmentDoc,
        data.createNoteLinkByShareAccess
      );

      return {
        noteId: payload.userNoteLink.note.id,
      } satisfies AccessSharedNoteResult;
    });
  }
);
