/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SelectionRange } from '../../../collab/src/client/selection-range';

beforeEach(() => {
  cy.resetDatabase();
});

function currentUserButton() {
  return cy.get('[aria-label="current user button"]');
}

function signOutAllUsersButton() {
  return cy.get('[aria-label="sign out all users"]');
}

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

function notesListItem(index: number, local = false) {
  return notesList().find(`> li[data-is-local="${local}"]`).eq(index);
}

function noteCard(noteId: string, local = false) {
  return notesList().find(
    `[aria-label="note card"][data-note-id="${noteId}"][data-is-local="${local}"]`
  );
}

function noteDialog(noteId: string, options?: Parameters<typeof cy.get>[1]) {
  return cy.get(`[aria-label="note dialog"][data-note-id="${noteId}"]`, options);
}

function noteSharingDialog(noteId: string) {
  return cy.get(`[aria-label="note sharing dialog"][data-note-id="${noteId}"]`);
}

function shouldUserCaretBeIndex(
  noteId: string,
  field: 'title' | 'content',
  displayName: string,
  index: number
) {
  noteDialog(noteId)
    .find(`[aria-label="${field}"] [aria-label="caret"][data-user-name="${displayName}"]`)
    .should('have.data', 'index', index);
}

it('sign in, create note, share link and collab edit with another user', () => {
  cy.visit('/');

  // Sign in with user 1
  currentUserButton().click();
  cy.contains('Sign in with Google').click();
  cy.get('[name="id"]').type('1');
  cy.get('[name="name"]').type('1 User');
  cy.contains('Sign In').click();

  currentUserButton().should('include.text', '1');

  // Create a new note and type in it
  cy.get('[placeholder="Take a note..."]').click();
  cy.get('[placeholder="Title"]').click();
  cy.focused().type('foo title');
  cy.get('[placeholder="Note"]').click();
  cy.focused().type('foo content');
  cy.contains('Close').click();

  notesListItem(0, false)
    .invoke('attr', 'data-note-id')
    .then((maybeNoteId) => {
      expect(maybeNoteId).to.not.be.undefined;
      if (typeof maybeNoteId !== 'string') {
        return;
      }
      const noteId = maybeNoteId;

      // Open note dialog and generate share note link
      noteCard(noteId).click();
      noteDialog(noteId).find('[aria-label="open note sharing dialog"]').click();
      noteSharingDialog(noteId).find('[aria-label="create share link"]').click();

      noteSharingDialog(noteId)
        .find('[aria-label="share note link field"][data-has-link="true"] input')
        .invoke('val')
        .then((shareNoteUrl) => {
          expect(shareNoteUrl).to.not.be.undefined;
          if (typeof shareNoteUrl !== 'string') {
            return;
          }

          noteSharingDialog(noteId).find('[aria-label="close dialog"]').click();
          noteDialog(noteId).find('[aria-label="close"]').click();

          // Sign out
          currentUserButton().click();
          signOutAllUsersButton().click();

          // Sign in with user 2
          currentUserButton().click();
          cy.contains('Sign in with Google').click();
          cy.get('[name="id"]').type('2');
          cy.get('[name="name"]').type('2 User');
          cy.contains('Sign In').click();

          currentUserButton().should('include.text', '2');

          // Access note via share url using user 2
          cy.visit(shareNoteUrl);
          noteDialog(noteId, {
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

      noteDialog(noteId).find('[placeholder="Title"]').should('have.value', 'foo title');
      noteDialog(noteId)
        .find('[placeholder="Note"]')
        .should('have.value', 'foo BOO content');
      // User 1 has selection after inserted " BOO"

      shouldUserCaretBeIndex(noteId, 'content', '1 User', 7);

      // User 2 selection stays after " BOO"
      cy.get('[placeholder="Note"]').click();
      cy.focused().type('{moveToStart}START:');
      cy.get('[placeholder="Note"]').should('have.value', 'START:foo BOO content');
    });
});
