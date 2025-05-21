import { CollabService, Selection } from '../../../collab/src';
import { Note } from '../../src/__generated__/graphql';
import { GraphQLService } from '../../src/graphql/types';
import { NoteTextFieldEditor, NoteTextFieldName } from '../../src/note/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { createCollabService } from '../support/utils/note/create-collab-service';
import { createNote } from '../support/utils/note/create-note';
import { submitChanges } from '../support/utils/note/submit-changes';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;

let collabService: CollabService;
let fields: Record<NoteTextFieldName, NoteTextFieldEditor>;

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
    ({ fields, collabService } = await createCollabService({
      graphQLService,
      noteId,
      userId,
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
    fields[NoteTextFieldName.TITLE].insert('start', Selection.create(0));

    await submitChanges({
      collabService,
      graphQLService,
      noteId,
    });

    fields[NoteTextFieldName.TITLE].insert('|end', Selection.create(5));

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
