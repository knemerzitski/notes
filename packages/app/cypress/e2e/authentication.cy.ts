beforeEach(() => {
  cy.resetDatabase();
});

it('signs out all users', () => {
  // Programmatic: sign in with two users
  cy.graphQLService().then((parent) => {
    cy.wrap(parent).signIn({
      googleUserId: '1',
      displayName: 'First',
    });
    cy.wrap(parent).signIn({
      googleUserId: '2',
      displayName: 'Second',
    });
    cy.wrap(parent).persistCache();
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
