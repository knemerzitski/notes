import { Note, NoteTextFieldName } from '../../../../src/__generated__/graphql';
import { __unstable_readNoteExternalState } from '../../../../src/note/policies/Note/_external';
import { SimpleText } from '../../../../../collab/src/types';
import { CollabService } from '../../../../../collab/src/client/collab-service';
import { GraphQLService } from '../../../../src/graphql/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      collabService: (options: CollabServiceOptions) => Chainable<CollabServiceResult>;
    }
  }
}

interface CollabServiceOptions {
  graphQLService: GraphQLService;
  noteId: Note['id'];
}

export interface CollabServiceResult {
  service: CollabService;
  fields: Record<NoteTextFieldName, SimpleText>;
}

Cypress.Commands.add(
  'collabService',
  ({ noteId, graphQLService }: CollabServiceOptions) => {
    return cy.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const noteExternalState = __unstable_readNoteExternalState(
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          __ref: graphQLService.client.cache.identify({
            __typename: 'Note',
            id: noteId,
          })!,
        },
        graphQLService.client.cache
      )!;

      return {
        service: noteExternalState.service,
        fields: Object.fromEntries(
          Object.entries(noteExternalState.fields).map(([key, value]) => [
            key,
            value.editor,
          ])
        ) as Record<NoteTextFieldName, SimpleText>,
      } satisfies CollabServiceResult;
    });
  }
);
