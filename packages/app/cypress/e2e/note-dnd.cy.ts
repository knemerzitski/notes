import { GraphQLService } from '../../src/graphql/types';
import { NoteTextFieldName } from '../../src/note/types';
import { AppStatus } from '../../src/utils/hooks/useAppStatus';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { createNote } from '../support/utils/note/create-note';
import { signIn } from '../support/utils/user/sign-in';

let graphQLService: GraphQLService;
let userId: string;

beforeEach(() => {
  cy.resetDatabase();

  // Create user with 6 notes
  cy.then(async () => {
    // Init GraphQLService
    graphQLService = await createGraphQLService();

    // Sign in
    ({ userId } = await signIn({
      graphQLService,
      signInUserId: 'dnd',
      displayName: 'DND',
    }));

    // Persist only signIn, fetch notes from server
    await persistCache(graphQLService);

    async function simpleCreateNote(value: string) {
      await createNote({
        graphQLService,
        userId,
        initialText: {
          [NoteTextFieldName.CONTENT]: value,
        },
      });
    }

    async function batchSimpleCreateNote(values: string[]) {
      for (const value of values) {
        // Create notes one at time to ensure correct order
        await simpleCreateNote(value);
      }
    }

    await batchSimpleCreateNote(['6', '5', '4', '3', '2', '1']);
  });
});

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

function noteItems(local = false) {
  return notesList().find(`> li[data-is-local="${local}"]`);
}

function noteByText(value: string) {
  return noteItems().contains(value).parent('li[aria-roledescription="sortable"]');
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

function shouldAppBeSync() {
  return shouldAppStatusEqual(['refresh', 'synchronized']);
}

function shouldHaveOrder(orderedValues: string[]) {
  noteItems().then((elements) => {
    const actualOrderedValues = elements.map((_i, el) => el.textContent).get();
    expect(actualOrderedValues).to.have.same.ordered.members(orderedValues);
  });
}

function arrowDnD(noteContent: string, commands: ('right' | 'left' | 'up' | 'down')[]) {
  function windowTriggerKeyDown(
    code: 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp' | 'Space'
  ) {
    cy.window().then((win) => {
      win.document.dispatchEvent(new win.KeyboardEvent('keydown', { code }));
    });
  }

  const preCommands = ['note-space'];
  const postCommands = ['space'];

  const allCommands = [...preCommands, ...commands, ...postCommands].flatMap(
    // Add wait after every command
    (value) => [value, 'wait']
  );

  cy.log('dnd', allCommands);

  allCommands.forEach((cmd) => {
    if (cmd === 'note-space') {
      noteByText(noteContent).focus().trigger('keydown', {
        code: 'Space',
      });
    } else if (cmd === 'right') {
      windowTriggerKeyDown('ArrowRight');
    } else if (cmd === 'left') {
      windowTriggerKeyDown('ArrowLeft');
    } else if (cmd === 'up') {
      windowTriggerKeyDown('ArrowUp');
    } else if (cmd === 'down') {
      windowTriggerKeyDown('ArrowDown');
    } else if (cmd === 'space') {
      windowTriggerKeyDown('Space');
    } else if (cmd === 'wait') {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(0);
    }
  });
}

[
  { network: 'online' },
  { network: 'offline' },
  {
    network: 'offline',
    reload: true,
  },
].forEach(({ network, reload }) => {
  describe(`network: ${network}, reload: ${reload ?? false}`, () => {
    beforeEach(() => {
      cy.visit('/');

      if (network === 'offline') {
        shouldAppBeSync();
        cy.goOffline();
      }
    });

    afterEach(() => {
      cy.goOnline();
    });

    function shouldOnlineSync(expectedFn: () => void) {
      if (reload) {
        cy.visit('/');
        expectedFn();
      }

      if (network === 'offline') {
        cy.goOnline();
      }
      // Extra check without optimistic response
      shouldAppBeSync();
      expectedFn();
    }

    it('swaps first two notes', () => {
      shouldHaveOrder(['1', '2', '3', '4', '5', '6']);
      arrowDnD('2', ['left']);
      shouldHaveOrder(['2', '1', '3', '4', '5', '6']);

      shouldOnlineSync(() => {
        shouldHaveOrder(['2', '1', '3', '4', '5', '6']);
      });
    });

    it('moves two notes in succession', () => {
      arrowDnD('5', ['up', 'right']);
      // prettier-ignore
      shouldHaveOrder([
        '1', '2', '5', 
        '3', '4', '6' 
      ]);

      arrowDnD('6', ['left', 'up']);
      // prettier-ignore
      shouldHaveOrder([
        '1', '6', '2', 
        '5', '3', '4' 
      ]);

      shouldOnlineSync(() => {
        // prettier-ignore
        shouldHaveOrder([
        '1', '6', '2', 
        '5', '3', '4' 
      ]);
      });
    });

    it('scramble 8 moves', () => {
      // prettier-ignore
      shouldHaveOrder([
        '1', '2', '3', 
        '4', '5', '6'
      ]);

      arrowDnD('1', ['right', 'right', 'down']);
      // prettier-ignore
      shouldHaveOrder([
        '2', '3', '4', 
        '5', '6', '1' 
      ]);

      arrowDnD('5', ['up']);
      // prettier-ignore
      shouldHaveOrder([
        '5', '2', '3', 
        '4', '6', '1' 
      ]);

      arrowDnD('3', ['left', 'down']);
      // prettier-ignore
      shouldHaveOrder([
        '5', '2', '4', 
        '6', '3', '1' 
      ]);

      arrowDnD('4', ['left', 'left']);
      // prettier-ignore
      shouldHaveOrder([
        '4', '5', '2', 
        '6', '3', '1' 
      ]);

      arrowDnD('2', ['down', 'left', 'left']);
      // prettier-ignore
      shouldHaveOrder([
        '4', '5', '6', 
        '2', '3', '1' 
      ]);

      arrowDnD('6', ['down']);
      // prettier-ignore
      shouldHaveOrder([
        '4', '5', '2', 
        '3', '1', '6' 
      ]);

      arrowDnD('2', ['left']);
      // prettier-ignore
      shouldHaveOrder([
        '4', '2', '5', 
        '3', '1', '6' 
      ]);

      arrowDnD('1', ['right']);
      // prettier-ignore
      shouldHaveOrder([
        '4', '2', '5', 
        '3', '6', '1' 
      ]);

      shouldOnlineSync(() => {
        // prettier-ignore
        shouldHaveOrder([
          '4', '2', '5', 
          '3', '6', '1' 
        ]);
      });
    });
  });
});
