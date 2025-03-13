import { CollabService } from '../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../collab/src/client/selection-range';
import { SimpleText } from '../../../collab/src/types';
import { Note, NoteTextFieldName } from '../../src/__generated__/graphql';
import { GraphQLService } from '../../src/graphql/types';

let graphQLService: GraphQLService;

let collabService: CollabService;
let fields: Record<NoteTextFieldName, SimpleText>;

let noteId: Note['id'];

beforeEach(() => {
  cy.resetDatabase();

  // Init GraphQLService
  cy.graphQLService().then((value) => {
    graphQLService = value.service;

    // Sign in
    cy.then(() => {
      cy.signIn({
        graphQLService,
        googleUserId: '1',
        displayName: 'First',
      }).then(({ userId }) => {
        // Create note
        cy.createNote({
          graphQLService,
          userId,
        }).then((value) => {
          noteId = value.noteId;

          // Init CollabService
          cy.collabService({
            graphQLService,
            noteId,
          }).then((value) => {
            collabService = value.service;
            fields = value.fields;
          });
        });
      });
    });
  });
});

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

function noteCard(noteId: string, options?: Parameters<typeof cy.get>[1]) {
  return notesList().find(`[aria-label="note card"][data-note-id="${noteId}"]`, options);
}

it('has inserted record in the background', () => {
  cy.then(() => {
    fields.TITLE.insert('start', SelectionRange.from(0));
  });

  cy.submitChanges({
    collabService,
    graphQLService,
    noteId,
  });

  cy.then(() => {
    fields.TITLE.insert('|end', SelectionRange.from(5));
  });

  cy.submitChanges({
    collabService,
    graphQLService,
    noteId,
  });

  // Ensures cache is read when visiting
  cy.restoreCache({
    graphQLService,
  });

  cy.visit('/');

  noteCard(noteId).should('contain.text', 'start|end');
});
