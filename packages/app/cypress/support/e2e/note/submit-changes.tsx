import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { useUpdateNoteInsertRecord } from '../../../../src/note/hooks/useUpdateNoteInsertRecord';
import { CollabService } from '../../../../../collab/src/client/collab-service';
import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submitChanges: (options: SubmitChangesOptions) => any;
    }
  }
}

interface SubmitChangesOptions {
  noteId: string;
  graphQLService: GraphQLService;
  collabService: CollabService;
}

Cypress.Commands.add(
  'submitChanges',
  ({ noteId, graphQLService, collabService }: SubmitChangesOptions) => {
    return cy.then(async () => {
      const {
        result: { current: insertRecord },
      } = renderHook(() => useUpdateNoteInsertRecord(), {
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

      collabService.submitChanges();
      const submittedRecord = collabService.submittedRecord;
      if (!submittedRecord) {
        return;
      }

      await insertRecord(noteId, submittedRecord);
    });
  }
);
