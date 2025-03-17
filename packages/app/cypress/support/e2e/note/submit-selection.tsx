import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { useUpdateOpenNoteSelectionRange } from '../../../../src/note/hooks/useUpdateOpenNoteSelectionRange';
import { SelectionRange } from '../../../../../collab/src/client/selection-range';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submitSelection: (options: SubmitSelectionOptions) => any;
    }
  }
}

interface SubmitSelectionOptions {
  noteId: string;
  graphQLService: GraphQLService;
  selectionRange: SelectionRange;
  revision: number;
  /**
   * Skip waiting for insert response
   */
  skipSync?: boolean;
}

Cypress.Commands.add(
  'submitSelection',
  ({
    noteId,
    graphQLService,
    revision,
    selectionRange,
    skipSync,
  }: SubmitSelectionOptions) => {
    return cy.then(async () => {
      const {
        result: { current: updateOpenNoteSelectionRange },
      } = renderHook(() => useUpdateOpenNoteSelectionRange(), {
        wrapper: ({ children }: { children: ReactNode }) => {
          return (
            <GraphQLServiceProvider service={graphQLService}>
              <CurrentUserIdProvider>
                <NoteIdProvider noteId={noteId}>{children}</NoteIdProvider>
              </CurrentUserIdProvider>
            </GraphQLServiceProvider>
          );
        },
      });

      const updatePromise = updateOpenNoteSelectionRange({
        note: {
          id: noteId,
        },
        revision,
        selectionRange,
      });

      if (!skipSync) {
        await updatePromise;
      }
    });
  }
);
