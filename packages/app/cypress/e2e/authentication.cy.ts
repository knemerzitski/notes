import { GraphQLService } from '../../src/graphql/types';

let graphQLService: GraphQLService;

beforeEach(() => {
  cy.resetDatabase();

  // Init GraphQLService
  cy.graphQLService().then((value) => {
    graphQLService = value.service;
  });
});

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

  cy.get('[aria-label="open accounts"]').click();
  cy.get('[aria-label="accounts info"]').should('include.text', 'First');
  cy.get('[aria-label="accounts info"]').should('include.text', 'Second');
  cy.contains('Sign out all accounts').click();

  cy.get('[aria-label="open accounts"]').click();

  // Ensure only local account is present
  cy.get('[aria-label="accounts info"]').should('not.include.text', 'First');
  cy.get('[aria-label="accounts info"]').should('not.include.text', 'Second');
  cy.get('[aria-label="current account"] [aria-label="name"]').contains('Local Account');
  cy.get('[aria-label="accounts list"]').should('have.length', 1);
});
