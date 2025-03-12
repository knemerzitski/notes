import { GraphQLService } from '../../src/graphql/types';

let graphQLService: GraphQLService;

beforeEach(() => {
  cy.resetDatabase();

  // Init GraphQLService
  cy.graphQLService().then((value) => {
    graphQLService = value.service;
  });
});

function currentUserButton() {
  return cy.get('[aria-label="current user button"]');
}

function usersInfo() {
  return cy.get('[aria-label="users info"]');
}

function usersList() {
  return usersInfo().find('[aria-label="users list"]');
}

function usersListItem(index: number) {
  return usersList().find('> li').eq(index);
}

function currentUserInfo() {
  return usersInfo().find('[aria-label="current user"]');
}

function signOutAllUsersButton() {
  return cy.get('[aria-label="sign out all users"]');
}

it('signs out all users', () => {
  // Programmatic: sign in with two users
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  });
  cy.signIn({
    graphQLService,
    googleUserId: '2',
    displayName: 'Second',
  });
  // Ensures cache is read when visiting
  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  currentUserButton().should('include.text', 'S');
  currentUserButton().click();

  currentUserInfo().should('include.text', 'Second');

  usersListItem(1).should('include.text', 'First');
  usersListItem(2).should('include.text', 'Second');

  //sign out all users
  signOutAllUsersButton().click();

  currentUserButton().get('[data-is-local="true"]');
  currentUserButton().click();

  currentUserInfo().should('include.text', 'Local Account');

  usersList().should('have.length', 1);
});
