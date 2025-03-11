/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SelectionRange } from '../../../collab/src/client/selection-range';

beforeEach(() => {
  cy.resetDatabase();
});

it('sign in, create note, share link and collab edit with another user', () => {
  cy.visit('/');

  // Sign in with user 1
  cy.get('[aria-label="open accounts"]').click();
  cy.contains('Sign in with Google').click();
  cy.get('[name="id"]').type('1');
  cy.get('[name="name"]').type('1 User');
  cy.contains('Sign In').click();

  cy.get('[aria-label="open accounts"]').should('contain.text', '1');

  // Create a new note and type in it
  cy.get('[placeholder="Take a note..."]').click();
  cy.get('[placeholder="Title"]').click();
  cy.focused().type('foo title');
  cy.get('[placeholder="Note"]').click();
  cy.focused().type('foo content');
  cy.contains('Close').click();

  // Get note id
  cy.get('[data-is-local="false"]');
  cy.get('[data-note-id]')
    .invoke('attr', 'data-note-id')
    .then((maybeNoteId) => {
      if (typeof maybeNoteId !== 'string') {
        return;
      }
      const noteId = maybeNoteId;

      // Open note dialog and generate share note link
      cy.get('[aria-label="open note dialog"]').click();

      cy.get('[role=dialog] [aria-label="Collaboration"]').click();

      cy.get('[aria-label="create share link"]').click();
      cy.get('[data-has-link="true"] input')
        .invoke('val')
        .then((shareNoteUrl) => {
          if (typeof shareNoteUrl !== 'string') {
            return;
          }

          cy.get('[aria-label="close sharing dialog"]').click();
          cy.contains('Close').click();

          // Sign out
          cy.get('[aria-label="open accounts"]').click();
          cy.contains('Sign out all accounts').click();

          // Sign in with user 2
          cy.get('[aria-label="open accounts"]').click();
          cy.contains('Sign in with Google').click();
          cy.get('[name="id"]').type('2');
          cy.get('[name="name"]').type('2 User');
          cy.contains('Sign In').click();

          cy.get('[aria-label="open accounts"]').should('contain.text', '2');

          // Access note via share url using user 2
          cy.visit(shareNoteUrl);
          cy.get(`[id="note-edit-dialog-${noteId}"]`, {
            // Visit can be slow
            timeout: 8000,
          }).should('be.visible');

          // Sign in with user 1 in the background and insert record
          cy.graphQLService({
            // Ensures user 2 cache is not overwritten since same localStorage is used
            storageKey: 'user1',
            logging: true,
          }).then(({ service: graphQLService }) => {
            cy.signIn({
              graphQLService,
              googleUserId: '1',
            });

            // Open note so that user 1 caret will be visible to user 2
            cy.openNoteSubscription({
              graphQLService,
              noteId,
            });

            // User 1 listens to new records
            cy.userSubscription({
              graphQLService,
            });

            // Ensure user 1 has up to date headText
            cy.syncHeadText({
              graphQLService,
              noteId,
            });

            cy.get('[placeholder="Title"]').should('have.value', 'foo title');
            cy.get('[placeholder="Note"]').should('have.value', 'foo content');

            cy.collabService({
              graphQLService,
              noteId,
            }).then(({ fields, service: collabService }) => {
              cy.then(() => {
                // "foo content" =>  "foo BOO content"
                fields.CONTENT.insert(' BOO', SelectionRange.from(3));
              });

              cy.submitChanges({
                collabService,
                graphQLService,
                noteId,
              });
            });
          });
        });
    });

  cy.get('[placeholder="Title"]').should('have.value', 'foo title');
  cy.get('[placeholder="Note"]').should('have.value', 'foo BOO content');
  // User 1 has selection after inserted " BOO"
  cy.get('[aria-label="other user caret"][data-user="1 User"]').should(
    'have.data',
    'index',
    7
  );

  // User 2 selection stays after " BOO"
  cy.get('[placeholder="Note"]').click();
  cy.focused().type('{moveToStart}START:');
  cy.get('[placeholder="Note"]').should('have.value', 'START:foo BOO content');
});
