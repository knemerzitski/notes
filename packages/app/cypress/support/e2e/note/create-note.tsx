import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { CreateNote } from '../../../../src/note/mutations/CreateNote';
import { useMutation } from '../../../../src/graphql/hooks/useMutation';
import { getFragmentData } from '../../../../src/__generated__';
import { CreateNotePayloadFragmentDoc } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      createNote: (options: CreateNoteOptions) => Chainable<CreateNoteResult>;
    }
  }
}

interface CreateNoteOptions {
  graphQLService: GraphQLService;
  userId: string;
}

interface CreateNoteResult {
  noteId: string;
}

Cypress.Commands.add('createNote', ({ graphQLService, userId }: CreateNoteOptions) => {
  return cy.then(async () => {
    const {
      result: {
        current: [createNote],
      },
    } = renderHook(() => useMutation(CreateNote), {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <GraphQLServiceProvider service={graphQLService}>
            <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
          </GraphQLServiceProvider>
        );
      },
    });

    const { data } = await createNote({
      variables: {
        input: {
          authUser: {
            id: userId,
          },
          collabText: {
            initialText: '{}',
          },
        },
      },
    });

    if (!data) {
      throw new Error('No data, is user signed in?');
    }

    const payload = getFragmentData(CreateNotePayloadFragmentDoc, data.createNote);

    const noteId = payload.userNoteLink.note.id;

    return {
      noteId,
    } satisfies CreateNoteResult;
  });
});
