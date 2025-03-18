import { CollabService } from '../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../collab/src/client/selection-range';
import { SimpleText } from '../../../collab/src/types';
import { Note, NoteTextFieldName } from '../../src/__generated__/graphql';
import { GraphQLService } from '../../src/graphql/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { createCollabService } from '../support/utils/note/create-collab-service';
import { createNote } from '../support/utils/note/create-note';
import { submitChanges } from '../support/utils/note/submit-changes';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;

let collabService: CollabService;
let fields: Record<NoteTextFieldName, SimpleText>;

let noteId: Note['id'];

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    // Init GraphQLService
    graphQLService = await createGraphQLService();

    // Sign in
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'First',
    });

    // Create note
    ({ noteId } = await createNote({
      graphQLService,
      userId,
    }));

    // Init CollabService
    ({ fields, collabService } = createCollabService({
      graphQLService,
      noteId,
    }));
  });
});

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

function noteCard(noteId: string, options?: Parameters<typeof cy.get>[1]) {
  return notesList().find(`[aria-label="note card"][data-note-id="${noteId}"]`, options);
}

it('has inserted record in the background', () => {
  cy.then(async () => {
    fields.TITLE.insert('start', SelectionRange.from(0));

    await submitChanges({
      collabService,
      graphQLService,
      noteId,
    });

    fields.TITLE.insert('|end', SelectionRange.from(5));

    await submitChanges({
      collabService,
      graphQLService,
      noteId,
    });

    // Ensures cache is read when visiting
    await persistCache(graphQLService);
  });

  cy.visit('/');

  noteCard(noteId).should('contain.text', 'start|end');
});
