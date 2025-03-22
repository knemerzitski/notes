import { GraphQLService } from '../../src/graphql/types';
import { NoteTextFieldName } from '../../src/note/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { createNote } from '../support/utils/note/create-note';
import { shareNote } from '../support/utils/note/share-note';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;
let userId: string;
let noteId: string;

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    // Init GraphQLService
    graphQLService = await createGraphQLService();

    // Sign in
    ({ userId } = await signIn({
      graphQLService,
      signInUserId: 'a',
      displayName: 'FooUser',
    }));

    // Create note
    ({ noteId } = await createNote({
      graphQLService,
      userId,
      initialText: {
        [NoteTextFieldName.TITLE]: 'foo',
        [NoteTextFieldName.CONTENT]: 'bar',
      },
    }));
  });
});

function noteRoute() {
  return `/note/${encodeURIComponent(noteId)}`;
}

function noteDialog() {
  return cy.get(`[aria-label="note dialog"][data-note-id="${noteId}"]`);
}

function collaborationButton() {
  return noteDialog().find('[aria-label="open note sharing dialog"]');
}

function noteSharingDialog() {
  return cy.get(`[aria-label="note sharing dialog"][data-note-id="${noteId}"]`);
}

function enableSharingToggle() {
  return noteSharingDialog().find('[aria-label="create share link"]');
}

function noteSharingLinkInput() {
  return noteSharingDialog().find(
    '[aria-label="share note link field"][data-has-link="true"] input'
  );
}

describe('no sharing link', () => {
  beforeEach(async () => {
    await persistCache(graphQLService);
  });

  it('can create share note link', () => {
    cy.visit(noteRoute());

    collaborationButton().click();
    enableSharingToggle().click();

    noteSharingLinkInput()
      .invoke('val')
      .then((shareNoteUrl) => {
        if (typeof shareNoteUrl !== 'string') {
          throw new Error(
            `Expected share note url "${String(shareNoteUrl)}" to be a string`
          );
        }

        cy.visit(shareNoteUrl);

        // Should redirect to note
        cy.location('pathname').should('equal', noteRoute());
      });
  });
});

describe('share link created', () => {
  let shareNoteUrl: string;

  beforeEach(async () => {
    // Share note by root beforeEach user
    ({ sharingLink: shareNoteUrl } = await shareNote({
      graphQLService,
      noteId,
      userId,
    }));

    // Overwrite graphQLService with a new user context
    await createGraphQLService().then(async (graphQLService) => {
      // Access shared note as another user
      await signIn({
        graphQLService,
        signInUserId: 'b',
        displayName: 'BarUser',
      });

      await persistCache(graphQLService);
    });
  });

  it('can access note shared by another user', () => {
    cy.visit(shareNoteUrl);

    // Should redirect to note
    cy.location('pathname').should('equal', noteRoute());

    // Extra check to see if note has correct text
    noteDialog().find('[aria-label="title"] input').should('have.value', 'foo');
    noteDialog().find('[aria-label="content"] textarea').should('have.value', 'bar');
  });
});
