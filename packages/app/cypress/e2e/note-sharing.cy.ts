import { GraphQLService } from '../../src/graphql/types';

let graphQLService: GraphQLService;
let userId: string;
let noteId: string;

beforeEach(() => {
  cy.resetDatabase();

  // Init GraphQLService
  cy.graphQLService().then((value) => {
    graphQLService = value.service;

    // Sign in
    cy.signIn({
      graphQLService,
      googleUserId: 'a',
      displayName: 'FooUser',
    }).then((value) => {
      userId = value.userId;

      // Create note
      cy.createNote({
        graphQLService,
        userId,
        initialText: {
          TITLE: 'foo',
          CONTENT: 'bar',
        },
      }).then((value) => {
        noteId = value.noteId;
      });
    });
  });
});

function noteRoute() {
  return `/note/${noteId}`;
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
  beforeEach(() => {
    cy.persistCache({
      graphQLService,
    });
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

  beforeEach(() => {
    // Share note by root beforeEach user
    cy.shareNote({
      graphQLService,
      noteId,
      userId,
    }).then((value) => {
      shareNoteUrl = value.sharingLink;
    });

    // Overwrite graphQLService with a new user context
    cy.graphQLService().then((value) => {
      graphQLService = value.service;

      // Access shared note as another user
      cy.signIn({
        graphQLService,
        googleUserId: 'b',
        displayName: 'BarUser',
      });

      cy.persistCache({
        graphQLService,
      });
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
