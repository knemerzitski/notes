import { GraphQLService } from '../../src/graphql/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    // Init GraphQLService
    graphQLService = await createGraphQLService();

    // Sign in
    await signIn({
      graphQLService,
      signInUserId: 'a',
      displayName: 'FooUser',
    });

    await persistCache(graphQLService);
  });
});

function createNoteWidget() {
  return cy.get('[aria-label="create note widget"]').filter(':visible');
}

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

function shouldHaveNotesCount(count: number) {
  return notesList().find('> li').should('have.length', count);
}

function notesListItem(index: number, local = false) {
  return notesList().find(`> li[data-is-local="${local}"]`).eq(index);
}

it('creates 1 note from widget', () => {
  cy.visit('/');

  createNoteWidget().click();
  createNoteWidget().find('[aria-label="content"]').type('bar');
  createNoteWidget().find('[aria-label="title"]').type('foo');
  createNoteWidget().find('[aria-label="close"]').click();

  notesListItem(0).should('include.text', 'foobar');
  shouldHaveNotesCount(1);
});

it('creates 2 notes from widget', () => {
  cy.visit('/');

  createNoteWidget().click();
  createNoteWidget().find('[aria-label="content"]').type('bar');
  createNoteWidget().find('[aria-label="title"]').type('foo');
  createNoteWidget().find('[aria-label="close"]').click();

  createNoteWidget().click();
  createNoteWidget().find('[aria-label="content"]').type('bar2');
  createNoteWidget().find('[aria-label="title"]').type('foo2');
  createNoteWidget().find('[aria-label="close"]').click();

  notesListItem(0).should('include.text', 'foo2bar2');
  notesListItem(1).should('include.text', 'foobar');
  shouldHaveNotesCount(2);
});
