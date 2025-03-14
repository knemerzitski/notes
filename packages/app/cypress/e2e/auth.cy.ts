import { SelectionRange } from '../../../collab/src/client/selection-range';
import { GraphQLService } from '../../src/graphql/types';
import { AppStatus } from '../../src/utils/hooks/useAppStatus';

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

function currentUserInfo() {
  return usersInfo().find('[aria-label="current user"]');
}

function usersList() {
  return usersInfo().find('[aria-label="users list"]');
}

function usersListItem(index: number) {
  return usersList().find('> li').eq(index);
}

function signInWithGoogleButton() {
  return usersInfo().find('[aria-label="sign in with google"]');
}

function signOutAllUsersButton() {
  return usersInfo().find('[aria-label="sign out all users"]');
}

function signInWithGoogleDialog() {
  return cy.get('[aria-label="sign in with google dialog"]');
}

function notesList() {
  return cy.get('[aria-label="notes list"]');
}

function notesListItem(index: number, local = false) {
  return notesList().find(`> li[data-is-local="${local}"]`).eq(index);
}

function noteDialog() {
  return cy.get(`[aria-label="note dialog"]`);
}

function shouldNotBlockUi() {
  return cy.get('[aria-label="block ui dialog"]').should('not.exist');
}

function userMoreOptionsMenu() {
  return cy.get('[aria-label="user more options menu"]');
}

/**
 * @see {@link https://github.com/cypress-io/cypress/issues/5655#issuecomment-734629040}
 */
function haveData(name: string, value: string) {
  return ($el: JQuery) => {
    expect($el[0]?.getAttribute(`data-${name}`)).to.be.equal(value);
  };
}

function shouldAppStatusEqual(value: AppStatus) {
  return cy.get('[aria-label="app status"]').should(haveData('status', value));
}

function triggerMouseOutMoreOptionsTooltip() {
  cy.get('.MuiTooltip-tooltip')
    .contains('More options')
    .should('be.visible')
    .trigger('mouseout');
}

it('first time signs in user', () => {
  cy.visit('/');

  currentUserButton().click();
  signInWithGoogleButton().click();

  signInWithGoogleDialog().find('input[name="id"]').type('1');
  signInWithGoogleDialog().find('input[name="name"]').type('1 User');

  signInWithGoogleDialog().find('button[type="submit"][aria-label="sign in"]').click();

  shouldNotBlockUi();

  currentUserButton().should('include.text', '1');
  currentUserButton().click();

  currentUserInfo().should('include.text', '1 User');

  usersListItem(1).should('include.text', '1 User');
});

it('first time signs in second user', () => {
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
    });
  });

  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  notesList().should('have.length', 1);

  currentUserButton().click();
  signInWithGoogleButton().click();

  signInWithGoogleDialog().find('input[name="id"]').type('2');
  signInWithGoogleDialog().find('input[name="name"]').type('2 User');

  signInWithGoogleDialog().find('button[type="submit"][aria-label="sign in"]').click();

  notesList().should('have.length', 0);

  currentUserButton().should('include.text', '2');
  currentUserButton().click();

  currentUserInfo().should('include.text', '2 User');

  usersListItem(1).should('include.text', 'First');
  usersListItem(2).should('include.text', '2 User');
});

it('switches users updating notes list', () => {
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'first',
      },
    });
  });

  cy.signIn({
    graphQLService,
    googleUserId: '2',
    displayName: 'Second',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'second',
      },
    });
  });

  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  notesList().should('have.length', 1);
  notesList().should('include.text', 'second');

  currentUserButton().click();

  usersListItem(1).click();

  notesList().should('have.length', 1);
  notesList().should('include.text', 'first');

  currentUserButton().should('include.text', 'F');
  currentUserButton().click();

  currentUserInfo().should('include.text', 'First');
});

it('refreshes user expired session', () => {
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'initial',
      },
    }).then(({ noteId }) => {
      cy.persistCache({
        graphQLService,
      });

      // Visit before inserting change that won't be known due to expired session
      cy.visit('/');

      // Insert change to note in the background in separate cache right before expiring session
      cy.graphQLService({
        storageKey: 'user2',
      }).then(({ service: graphQLService2 }) => {
        graphQLService2.client.restore(graphQLService.client.extract());

        cy.collabService({
          graphQLService: graphQLService2,
          noteId,
        }).then(({ fields, service: collabService }) => {
          cy.then(() => {
            fields.CONTENT.insert(' updated', SelectionRange.from(7));
          });

          cy.submitChanges({
            collabService,
            graphQLService: graphQLService2,
            noteId,
          });
        });
      });

      cy.expireUserSessions({
        userId,
      });
    });
  });

  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  cy.contains('Current session has expired! Please sign in.').should('be.visible');

  currentUserButton().find('[aria-label="session expired"]').should('exist');
  currentUserButton().click();

  usersListItem(1).should('contain.text', 'Session expired');
  usersListItem(1).find('[aria-label="more options"]').click();
  triggerMouseOutMoreOptionsTooltip();
  userMoreOptionsMenu().find('[aria-label="sign in"]').click();

  cy.get('[aria-label="sign in modal"] [aria-label="sign in with google"]').click();

  signInWithGoogleDialog().find('button[type="submit"][aria-label="sign in"]').click();

  shouldNotBlockUi();

  currentUserButton().find('[aria-label="session expired"]').should('not.exist');

  notesList().should('have.length', 1);
  // Open note dialog to update it text value
  notesListItem(0).click();
  noteDialog().find('[aria-label="close"]').click();
  notesList().should('include.text', 'initial updated');
});

it('switches to a user with expired session and shows notes', () => {
  let expireUserId: string;
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'first',
      },
    });

    cy.persistCache({
      graphQLService,
    });

    // Load page once to cache note
    cy.visit('/');

    expireUserId = userId;
  });

  shouldAppStatusEqual('refresh');

  // Restore cache from visiting the page
  cy.restoreCache({
    graphQLService,
  });

  cy.signIn({
    graphQLService,
    googleUserId: '2',
    displayName: 'Second',
  }).then(({ userId }) => {
    cy.createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'second',
      },
    });
  });

  cy.then(() => {
    cy.expireUserSessions({
      userId: expireUserId,
    });
  });

  cy.visit('/');
  currentUserButton().click();
  usersListItem(1).click();

  currentUserButton().find('[aria-label="session expired"]').should('exist');

  notesList().should('have.length', 1);
  notesList().should('include.text', 'first');
});

it('forgets user with expired session', () => {
  cy.signIn({
    graphQLService,
    googleUserId: '1',
    displayName: 'First',
  }).then(({ userId }) => {
    cy.expireUserSessions({
      userId,
    });
  });

  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  cy.contains('Current session has expired! Please sign in.').should('be.visible');

  currentUserButton().find('[aria-label="session expired"]').should('exist');
  currentUserButton().click();

  usersListItem(1).should('contain.text', 'Session expired');
  usersListItem(1).find('[aria-label="more options"]').click();
  userMoreOptionsMenu().find('[aria-label="forget"]').click();

  cy.contains('Current session has expired! Please sign in.', {
    timeout: 1000,
  }).should('not.exist');

  currentUserInfo().should('include.text', 'Local Account');
  usersList().should('have.length', 1);
});

it('signs out specific user', () => {
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

  cy.persistCache({
    graphQLService,
  });

  cy.visit('/');

  currentUserButton().click();

  usersListItem(2).find('[aria-label="more options"]').click();
  triggerMouseOutMoreOptionsTooltip();
  userMoreOptionsMenu().find('[aria-label="sign out"]').click();

  usersListItem(0).should('include.text', 'Local Account');
  usersListItem(1).should('include.text', 'First');
  usersListItem(2).should('not.exist');
});

it('signs out all users', () => {
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
