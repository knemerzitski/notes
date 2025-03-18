import { SelectionRange } from '../../../collab/src/client/selection-range';
import { GraphQLService } from '../../src/graphql/types';
import { AppStatus } from '../../src/utils/hooks/useAppStatus';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { restoreCache } from '../support/utils/graphql/restore-cache';
import { createCollabService } from '../support/utils/note/create-collab-service';
import { createNote } from '../support/utils/note/create-note';
import { submitChanges } from '../support/utils/note/submit-changes';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    graphQLService = await createGraphQLService();
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

function shouldHaveUsersCount(count: number) {
  usersInfo().find('[aria-label="users list"] > li').should('have.length', count);
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

function notesListEmpty() {
  return cy.get('[aria-label="notes list empty"]');
}

function notesList() {
  return cy.get('[aria-label="notes list"]');
}

function shouldHaveNotesCount(count: number) {
  return cy.get('[aria-label="notes list"] > li').should('have.length', count);
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
function haveData(name: string, value: string[] | string) {
  return ($el: JQuery) => {
    expect($el[0]?.getAttribute(`data-${name}`)).to.be.oneOf(
      Array.isArray(value) ? value : [value]
    );
  };
}

function shouldAppStatusEqual(value: AppStatus[] | AppStatus) {
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
  cy.then(async () => {
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'First05',
    });

    await createNote({
      graphQLService,
      userId,
    });

    await persistCache(graphQLService);
  });

  cy.visit('/');

  shouldHaveNotesCount(1);

  currentUserButton().click();
  signInWithGoogleButton().click();

  signInWithGoogleDialog().find('input[name="id"]').type('2');
  signInWithGoogleDialog().find('input[name="name"]').type('2 User');

  signInWithGoogleDialog().find('button[type="submit"][aria-label="sign in"]').click();

  shouldHaveNotesCount(0);

  currentUserButton().should('include.text', '2');
  currentUserButton().click();

  currentUserInfo().should('include.text', '2 User');

  usersListItem(1).should('include.text', 'First05');
  usersListItem(2).should('include.text', '2 User');
});

it('updates notes list when switching user', () => {
  cy.then(async () => {
    await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'First10',
    }).then(async ({ userId }) => {
      await createNote({
        graphQLService,
        userId,
        initialText: {
          CONTENT: 'first',
        },
      });
    });

    // Can't sign in two users at the same time since Set-Cookie replaces all sessions
    await signIn({
      graphQLService,
      signInUserId: '2',
      displayName: 'Second10',
    }).then(async ({ userId }) => {
      await createNote({
        graphQLService,
        userId,
        initialText: {
          CONTENT: 'second',
        },
      });
    });

    await persistCache(graphQLService);
  });

  cy.visit('/');

  shouldHaveNotesCount(1);
  notesList().should('include.text', 'second');

  currentUserButton().click();

  usersListItem(1).click();

  notesListEmpty().should('not.exist');

  shouldHaveNotesCount(1);
  notesList().should('include.text', 'first');

  currentUserButton().should('include.text', 'F');
  currentUserButton().click();

  currentUserInfo().should('include.text', 'First10');
});

it('refreshes user expired session', () => {
  cy.then(() => {
    let userId: string, noteId: string;
    cy.then(async () => {
      ({ userId } = await signIn({
        graphQLService,
        signInUserId: '1',
        displayName: 'First15',
      }));

      ({ noteId } = await createNote({
        graphQLService,
        userId,
        initialText: {
          CONTENT: 'initial',
        },
      }));

      await persistCache(graphQLService);
    });

    // Visit before inserting change that won't be known due to expired session
    cy.visit('/');

    cy.then(async () => {
      const graphQLService2 = await createGraphQLService({
        storageKey: 'user2',
      });

      // Insert change to note in the background in separate cache right before expiring session
      graphQLService2.client.restore(graphQLService.client.extract());

      const { fields, collabService } = createCollabService({
        graphQLService: graphQLService2,
        noteId,
      });

      fields.CONTENT.insert(' updated', SelectionRange.from(7));

      await submitChanges({
        collabService,
        graphQLService: graphQLService2,
        noteId,
      });
    });

    cy.then(() => {
      cy.expireUserSessions({
        userId,
      });
    });
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

  shouldHaveNotesCount(1);
  // Open note dialog to update it text value
  notesListItem(0).click();
  noteDialog().find('[aria-label="close"]').click();
  notesList().should('include.text', 'initial updated');
});

it('switches to a user with expired session and shows notes', () => {
  let expireUserId: string;

  cy.then(async () => {
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'First',
    });

    await createNote({
      graphQLService,
      userId,
      initialText: {
        CONTENT: 'first',
      },
    });

    await persistCache(graphQLService);

    expireUserId = userId;
  });

  // Load page once to cache created note
  cy.visit('/');

  shouldAppStatusEqual('refresh');

  // Restore cache from visiting the page
  cy.then(async () => {
    await restoreCache(graphQLService);
  });

  // Create another note that won't be shown due to expired session
  cy.then(async () => {
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '2',
      displayName: 'Second20',
    });

    await createNote({
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

  shouldHaveNotesCount(1);
  notesList().should('include.text', 'first');
});

it('forgets user with expired session', () => {
  cy.then(async () => {
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'Forget me',
    });

    cy.then(() => {
      cy.expireUserSessions({
        userId,
      });
    });

    await persistCache(graphQLService);
  });

  cy.visit('/');

  cy.contains('Current session has expired! Please sign in.').should('be.visible');

  currentUserButton().find('[aria-label="session expired"]').should('exist');
  currentUserButton().click();

  shouldHaveUsersCount(2);

  usersListItem(1).should('contain.text', 'Session expired');
  usersListItem(1).find('[aria-label="more options"]').click();
  userMoreOptionsMenu().find('[aria-label="forget"]').click();

  cy.contains('Current session has expired! Please sign in.', {
    timeout: 1000,
  }).should('not.exist');

  currentUserInfo().should('include.text', 'Local Account');
  shouldHaveUsersCount(1);
});

it('signs out specific user', () => {
  cy.then(async () => {
    await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'First30',
    });
    await signIn({
      graphQLService,
      signInUserId: '2',
      displayName: 'Second30',
    });

    await persistCache(graphQLService);
  });

  cy.visit('/');

  currentUserButton().click();

  usersListItem(2).find('[aria-label="more options"]').click();
  triggerMouseOutMoreOptionsTooltip();
  userMoreOptionsMenu().find('[aria-label="sign out"]').click();

  usersListItem(0).should('include.text', 'Local Account');
  usersListItem(1).should('include.text', 'First30');
  usersListItem(2).should('not.exist');
});

it('signs out all users', () => {
  cy.then(async () => {
    await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: 'aaa',
    });
    await signIn({
      graphQLService,
      signInUserId: '2',
      displayName: 'bbb',
    });
    await signIn({
      graphQLService,
      signInUserId: '3',
      displayName: 'ccc',
    });

    await persistCache(graphQLService);
  });

  cy.visit('/');

  currentUserButton().click();

  currentUserButton().should('include.text', 'c');
  currentUserInfo().should('include.text', 'ccc');

  shouldHaveUsersCount(4);
  usersListItem(1).should('include.text', 'aaa');
  usersListItem(1).should('not.contain.text', 'Session expired');
  usersListItem(2).should('include.text', 'bbb');
  usersListItem(2).should('not.contain.text', 'Session expired');
  usersListItem(3).should('include.text', 'ccc');
  usersListItem(3).should('not.contain.text', 'Session expired');

  signOutAllUsersButton().click();

  currentUserButton().click();
  currentUserButton().get('[data-is-local="true"]');

  currentUserInfo().should('include.text', 'Local Account');

  shouldHaveUsersCount(1);
});
