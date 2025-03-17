/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { getFragmentData } from '../../../../src/__generated__';
import { ShareNotePayloadFragmentDoc } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';
import { useShareNote } from '../../../../src/note/hooks/useShareNote';
import { getUserNoteLinkId } from '../../../../src/note/utils/id';
import { getShareUrl } from '../../../../src/note/utils/get-share-url';
import { UserIdProvider } from '../../../../src/user/context/user-id';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      shareNote: (options: ShareNoteOptions) => Chainable<ShareNoteResult>;
    }
  }
}

interface ShareNoteOptions {
  graphQLService: GraphQLService;
  userId: string;
  noteId: string;
}

interface ShareNoteResult {
  sharingLink: string;
  shareAccessId: string;
}

Cypress.Commands.add(
  'shareNote',
  ({ graphQLService, userId, noteId }: ShareNoteOptions) => {
    return cy.then(async () => {
      const {
        result: { current: shareNote },
      } = renderHook(() => useShareNote(), {
        wrapper: ({ children }: { children: ReactNode }) => {
          return (
            <GraphQLServiceProvider service={graphQLService}>
              <UserIdProvider userId={userId}>{children}</UserIdProvider>
            </GraphQLServiceProvider>
          );
        },
      });

      const { data } = await shareNote({
        userNoteLinkId: getUserNoteLinkId(noteId, userId),
      });

      if (!data) {
        throw new Error('shareNote: no response data');
      }

      const payload = getFragmentData(ShareNotePayloadFragmentDoc, data.shareNote);

      const shareAccessId = payload.note.shareAccess!.id;

      return {
        sharingLink: getShareUrl(shareAccessId),
        shareAccessId,
      } satisfies ShareNoteResult;
    });
  }
);
