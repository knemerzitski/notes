import { GraphQLService } from '../../src/graphql/types';
import { NoteTextFieldName } from '../../src/note/types';
import { setPerPageCount } from '../support/utils/device/per-page-count';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { addNoteToList } from '../support/utils/note/add-note-to-list';
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
      signInUserId: 'notesList',
      displayName: 'NoteList',
    }));

    await persistCache(graphQLService);
  });
});

async function simpleCreateNote(value: string) {
  const { noteId } = await createNote({
    graphQLService,
    userId,
    initialText: {
      [NoteTextFieldName.CONTENT]: value,
    },
  });
  return noteId;
}

function notesList() {
  return cy.get(`[aria-label="notes list"]`);
}

/**
 * - `\d` - note card with content
 * - `S` - skeletion
 * - `\d.L` - loading note card with content
 */
function shouldNotesList(expectedList: string[]) {
  notesList().should(($list) => {
    const children = $list.get(0).children;
    const actualList = [...children].map((child) => {
      if (child.matches('[aria-label="skeleton"]')) {
        return 'S';
      } else if (child.querySelector('[aria-label="loading"]') != null) {
        return `${child.textContent ?? ''}.L`;
      } else if (child.matches('li')) {
        return child.textContent ?? '';
      }

      return 'U';
    });

    expect(actualList).to.have.same.ordered.members(expectedList);
  });
}

async function initializeState({
  perPage: perPageCount,
  server: serverNotes,
  client: clientNotesCount,
}: {
  perPage: number;
  /**
   * Notes created in server
   */
  server: string[];
  /**
   * How many notes has client cached
   */
  client: number;
}) {
  setPerPageCount({
    perPageCount,
    graphQLService,
  });

  if (clientNotesCount === 0) {
    await persistCache(graphQLService);
  }

  let i = serverNotes.length;
  for (const value of serverNotes.toReversed()) {
    // Create notes one at time to ensure correct order
    const noteId = await simpleCreateNote(value);
    i--;
    if (i < clientNotesCount) {
      addNoteToList({
        noteId,
        graphQLService,
      });
    }
  }

  if (clientNotesCount > 0) {
    await persistCache(graphQLService);
  }
}

it('empty notes no loading', () => {
  cy.visit('/');
  cy.get('[aria-label="notes list empty"]').should('be.visible');
});

it('user list empty, fetch 1 note', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1'],
      client: 0,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
      ['S', 'S'],
      ['1'],
    ];
  expected.forEach(shouldNotesList);
});

it('shows no skeleton when have existing note', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1'],
      client: 1,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['1.L'],
    ['1'],
    ];
  expected.forEach(shouldNotesList);
});

it('user list empty, get next page once', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3'],
      client: 0,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['S', 'S'],
    ['1', '2', 'S', 'S'],
    ['1', '2', '3'],
    ];
  expected.forEach(shouldNotesList);
});

it('user list 1 note, fetch next page', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3'],
      client: 1,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['1.L'],
    ['1', '2', 'S', 'S'],
    ['1', '2', '3'],
  ];
  expected.forEach(shouldNotesList);
});

it('user list 2 notes, fetch next page', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3'],
      client: 2,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['1.L', '2.L'],
    ['1', '2', 'S', 'S'],
    ['1', '2', '3'],
  ];
  expected.forEach(shouldNotesList);
});

it('user list 3 notes, fetch next page', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3'],
      client: 3,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['1.L', '2.L', '3'],
    ['1', '2', '3.L', 'S'],
    ['1', '2', '3'],
    ];
  expected.forEach(shouldNotesList);
});

it('user list empty, fetches multiple pages', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3', '4', '5'],
      client: 0,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['S', 'S'],
    ['1', '2', 'S', 'S'],
    ['1', '2', '3', '4', 'S', 'S'],
    ['1', '2', '3', '4', '5'],
    ];
  expected.forEach(shouldNotesList);
});

it('user list 5 notes, fetches multiple pages', () => {
  cy.then(() =>
    initializeState({
      perPage: 2,
      server: ['1', '2', '3', '4', '5'],
      client: 5,
    })
  );

  cy.visit('/');

  // prettier-ignore
  const expected = [
    ['1.L', '2.L', '3',   '4',   '5'],
    ['1',   '2',   '3.L', '4.L', '5'],
    ['1',   '2',   '3',   '4',   '5.L', 'S'],
    ['1',   '2',   '3',   '4',   '5'],
    ];
  expected.forEach(shouldNotesList);
});
