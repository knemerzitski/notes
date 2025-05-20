/* eslint-disable @typescript-eslint/no-unused-expressions */

import { Selection } from '../../../collab/src';

import { GraphQLService } from '../../src/graphql/types';
import { NoteTextFieldName } from '../../src/note/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { createCollabService } from '../support/utils/note/create-collab-service';
import { openNoteSubscription } from '../support/utils/note/open-note-subscription';
import { submitChanges } from '../support/utils/note/submit-changes';
import { syncHeadText } from '../support/utils/note/sync-head-text';
import { signIn } from '../support/utils/user/sign-in';
import { userSubscription } from '../support/utils/user/user-subscription';

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

function createNoteWidget() {
  return cy.get('[aria-label="create note widget"]').filter(':visible');
}

function signInWithGoogleDialog() {
  return cy.get('[aria-label="sign in with google dialog"]');
}

function usersInfo() {
  return cy.get('[aria-label="users info"]');
}

function signInWithGoogleButton() {
  return usersInfo().find('[aria-label="sign in with google"]');
}

function shouldNotBlockUi() {
  return cy.get('[aria-label="block ui dialog"]').should('not.exist');
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
  signInWithGoogleButton().click();
  signInWithGoogleDialog().find('input[name="id"]').type('1');
  signInWithGoogleDialog().find('input[name="name"]').type('1 User');
  signInWithGoogleDialog().find('button[type="submit"][aria-label="sign in"]').click();

  currentUserButton().should('include.text', '1');

  shouldNotBlockUi();

  // Create a new note and type in it
  createNoteWidget().click();
  createNoteWidget().find('[aria-label="content"]').type('foo content');
  createNoteWidget().find('[aria-label="title"]').type('foo title');
  createNoteWidget().find('[aria-label="close"]').click();

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
          noteDialog(noteId).should('be.visible');

          cy.then(() => {
            let userId: string;
            let graphQLService: GraphQLService;
            cy.then(async () => {
              // Sign in with user 1 in the background and insert record
              graphQLService = await createGraphQLService({
                // Ensures user 2 cache is not overwritten since same localStorage is used
                storageKey: 'user1',
              });

              ({ userId } = await signIn({
                graphQLService,
                signInUserId: '1',
              }));

              // Open note so that user 1 caret will be visible to user 2
              openNoteSubscription({
                graphQLService,
                noteId,
              });

              // User 1 listens to new records
              userSubscription({
                graphQLService,
              });

              // Ensure user 1 has up to date headText
              await syncHeadText({
                graphQLService,
                noteId,
              });
            });

            cy.get('[placeholder="Title"]').should('have.value', 'foo title');
            cy.get('[placeholder="Note"]').should('have.value', 'foo content');

            cy.then(async () => {
              const { fields, collabService } = createCollabService({
                graphQLService,
                noteId,
                userId,
              });

              // "foo content" =>  "foo BOO content"
              fields[NoteTextFieldName.CONTENT].insert(' BOO', Selection.create(3));

              await submitChanges({
                collabService,
                graphQLService,
                noteId,
              });
            });
          });
        });

      noteDialog(noteId)
        .find('[aria-label="title"] input')
        .should('have.value', 'foo title');
      noteDialog(noteId)
        .find('[aria-label="content"] textarea')
        .should('have.value', 'foo BOO content');
      // User 1 has selection after inserted " BOO"

      shouldUserCaretBeIndex(noteId, 'content', '1 User', 7);

      // User 2 selection stays after " BOO"
      noteDialog(noteId).find('[aria-label="content"]').click();
      cy.focused().type('{moveToStart}START:');
      noteDialog(noteId)
        .find('[aria-label="content"] textarea')
        .should('have.value', 'START:foo BOO content');
    });
});
