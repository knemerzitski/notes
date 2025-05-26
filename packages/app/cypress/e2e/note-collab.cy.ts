/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';

import { createLogger } from '../../../utils/src/logging';

import { MaybePromise } from '../../../utils/src/types';

import { NoteTextFieldName } from '../../src/note/types';
import { AppStatus } from '../../src/utils/hooks/useAppStatus';
import { CyElementField } from '../support/e2e/collab-users/cy-element-field';
import { SimpleTextField } from '../support/e2e/collab-users/simple-text-field';
import { SimpleTextFieldsOperationsQueue } from '../support/e2e/collab-users/simple-text-fields-operations-queue';
import { FieldEditor, Field, UserContext } from '../support/e2e/collab-users/types';
import { createGraphQLService } from '../support/utils/graphql/create-graphql-service';
import { persistCache } from '../support/utils/graphql/persist-cache';
import { createCollabService } from '../support/utils/note/create-collab-service';
import { createNote } from '../support/utils/note/create-note';
import { createNoteLinkByShareAccess } from '../support/utils/note/create-note-link-by-share-access';
import { openNoteSubscription } from '../support/utils/note/open-note-subscription';
import { shareNote } from '../support/utils/note/share-note';
import { submitChanges } from '../support/utils/note/submit-changes';
import { syncHeadText } from '../support/utils/note/sync-head-text';
import { updateOpenNoteSelectionRange } from '../support/utils/note/update-open-note-selection-range';
import { signIn } from '../support/utils/user/sign-in';
import { userSubscription } from '../support/utils/user/user-subscription';

let user1: UserContext & {
  editor: Record<Field, CyElementField>;
  bgEditor: Record<Field, FieldEditor>;
  bgQueuedChangesSubmitted: () => Promise<void>;
};

let user2: UserContext & {
  editor: Record<Field, SimpleTextField>;
  submitSelection: () => Promise<void>;
  ongoingChangesPromise: () => Promise<void>;
};
let noteId: string;
let shareAccessId: string;

let nextStorageKeyCounter = 0;

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    // Init user 1, who will be displayed in UI
    const graphQLService = await createGraphQLService({
      logger: createLogger('user1:graphql'),
      debug: {
        logging: false,
      },
    });

    // Sign in
    const { userId } = await signIn({
      graphQLService,
      signInUserId: '1',
      displayName: '1ab',
    });

    // Create note
    ({ noteId } = await createNote({
      graphQLService,
      userId,
    }));

    await syncHeadText({
      graphQLService,
      noteId,
    });

    const { fields, collabService } = await createCollabService({
      graphQLService,
      noteId,
      userId,
    });

    const _submitChanges = async () => {
      await submitChanges({
        collabService,
        graphQLService,
        noteId,
      });
    };

    const queue = new SimpleTextFieldsOperationsQueue(collabService, _submitChanges);

    const bgEditor = {
      title: new SimpleTextField(fields[NoteTextFieldName.TITLE], collabService, queue),
      content: new SimpleTextField(
        fields[NoteTextFieldName.CONTENT],
        collabService,
        queue
      ),
    };

    user1 = {
      userId,
      type: 'interface',
      editor: {
        title: new CyElementField(titleField),
        content: new CyElementField(contentField),
      },
      bgEditor,
      bgQueuedChangesSubmitted: () => queue.executingOperations(),
      submitChanges: _submitChanges,
      graphQLService,
      collabService: {
        service: collabService,
        fields,
      },
    };

    // Create link to share note
    ({ shareAccessId } = await shareNote({
      userId,
      noteId,
      graphQLService,
    }));

    // Init user 2, who will be programmatically controlled in the background
    await createGraphQLService({
      storageKeyPrefix: `test:user2:${nextStorageKeyCounter++}:`,
      logger: createLogger('user2:graphql'),
      debug: {
        logging: false,
      },
    }).then(async (graphQLService) => {
      const { userId } = await signIn({
        graphQLService,
        signInUserId: '2',
        displayName: '2tppp',
      });

      await createNoteLinkByShareAccess({
        graphQLService,
        shareAccessId,
        userId,
      });

      // Open note so that carets will be displayed
      openNoteSubscription({
        graphQLService,
        noteId,
      });

      // Listens to new records
      userSubscription({
        graphQLService,
      });

      // Ensure user2 has up to date headText
      await syncHeadText({
        graphQLService,
        noteId,
      });

      const { fields, collabService } = await createCollabService({
        graphQLService,
        noteId,
        userId,
      });

      const _submitChanges = async () => {
        await submitChanges({
          collabService,
          graphQLService,
          noteId,
        });
      };

      const queue = new SimpleTextFieldsOperationsQueue(collabService, _submitChanges);

      const testEditorByName = {
        title: new SimpleTextField(fields[NoteTextFieldName.TITLE], collabService, queue),
        content: new SimpleTextField(
          fields[NoteTextFieldName.CONTENT],
          collabService,
          queue
        ),
      };

      let lastSelectedTestEditor: SimpleTextField | null;
      Object.values(testEditorByName).forEach((testEditor) => {
        testEditor.eventBus.on('selectionChanged', () => {
          lastSelectedTestEditor = testEditor;
        });
      });

      user2 = {
        userId,
        type: 'background',
        graphQLService,
        collabService: {
          service: collabService,
          fields,
        },
        editor: testEditorByName,
        ongoingChangesPromise: () => queue.executingOperations(),
        submitChanges: _submitChanges,
        submitSelection: async () => {
          const testEditor = lastSelectedTestEditor;
          if (!testEditor) {
            return;
          }

          const serviceSelection = testEditor.getServiceSelection();
          if (!serviceSelection.selection) {
            return;
          }

          await updateOpenNoteSelectionRange({
            graphQLService,
            noteId,
            selection: serviceSelection.selection,
            revision: serviceSelection.revision,
          });
        },
      };
    });

    await persistCache(graphQLService);
  });
});

afterEach(async () => {
  // Must dispose or using too many concurrent WebSocket clients without proper cleanup will hang any further requests
  await Promise.all([user1.graphQLService.dispose(), user2.graphQLService.dispose()]);
});

function noteRoute() {
  return `/note/${encodeURIComponent(noteId)}`;
}

function noteDialog() {
  return cy.get(`[aria-label="note dialog"][data-note-id="${noteId}"]`);
}

function titleField() {
  return noteDialog().find('[aria-label="title"] input');
}

function contentField() {
  return noteDialog().find('[aria-label="content"] textarea').eq(0);
}

function undoButton() {
  return noteDialog().find('[aria-label="history undo"]');
}

function redoButton() {
  return noteDialog().find('[aria-label="history redo"]');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldTitleCaretBeIndex(index: number) {
  titleField().then((subject) => {
    const el = subject.get()[0]! as HTMLInputElement;
    expect(el.selectionStart).to.equal(index);
  });
}

function shouldContentCaretBeIndex(index: number) {
  contentField().then((subject) => {
    const el = subject.get()[0]! as HTMLTextAreaElement;
    expect(el.selectionStart).to.equal(index);
  });
}

function shouldUser2CaretBeIndex(field: 'title' | 'content', index: number) {
  noteDialog()
    .find(`[aria-label="${field}"] [aria-label="caret"][data-user-id="${user2.userId}"]`)
    .should('have.data', 'index', index);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldTitleHaveValue(value: string) {
  noteDialog().find('[aria-label="title"] input').should('have.value', value);
}

function shouldContentHaveValue(value: string) {
  noteDialog().find('[aria-label="content"] textarea').should('have.value', value);
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

function shouldHaveRevision(revision: number) {
  noteDialog()
    .find('[aria-label="collab service status"]')
    .should(haveData('revision', String(revision)));
}

function shouldAppStatusEqual(value: AppStatus[] | AppStatus) {
  return cy.get('[aria-label="app status"]').should(haveData('status', value));
}

function user2Avatar() {
  return noteDialog().find(
    `[aria-label="active users"] [aria-label="avatar"][data-user-id="${user2.userId}"]`
  );
}

function retry(
  fn: () => MaybePromise<void>,
  options?: {
    /**
     * @default 3
     */
    maxRetries?: number;
    /**
     * @default 500 ms
     */
    timeout?: number;
  }
) {
  cy.then(async () => {
    let attemptsRemaining = 1 + (options?.maxRetries ?? 3);
    const timeout = options?.timeout ?? 500;

    const _log = Cypress.log.bind(Cypress);
    // @ts-expect-error Ignore typing
    Cypress.log = (...args) => {
      const [options] = args;
      // @ts-expect-error Ignore typing
      if (options.name === 'assert' && options.passed === false) {
        // Ignore failed assertions while attemptsRemaining > 0
        if (attemptsRemaining > 0) {
          return;
        }
      }
      return _log(...args);
    };
    try {
      while (attemptsRemaining-- > 0) {
        try {
          await fn();
          return;
        } catch (err) {
          if (attemptsRemaining <= 0) {
            throw err;
          } else {
            await new Promise((res) => {
              setTimeout(res, timeout);
            });
          }
        }
      }
    } finally {
      Cypress.log = _log;
    }
  });
}

describe('with empty text', () => {
  it('receives text from user 2', () => {
    cy.visit(noteRoute());

    cy.then(() => {
      user2.editor.content.insert('foobar');
      void user2.submitChanges();
    });

    shouldContentHaveValue('foobar');
  });

  it('has visible user 2 avatar', () => {
    cy.visit(noteRoute());

    user2Avatar().should('be.visible');
  });

  it('can undo and redo interweaved history', () => {
    cy.visit(noteRoute());

    // user 1 type [1][2][3][4] and then undo and redo it
    // user 2 type [a][b][c][d] and then undo and redo it

    //
    user1.editor.content.insert('[1]', {
      delay: 0,
    });
    shouldContentHaveValue('[1]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1]');
    });
    cy.then(() => {
      user2.editor.content.select(3);
      user2.editor.content.insert('[a]', {
        delay: 0,
      });
    });
    shouldContentHaveValue('[1][a]');

    //
    user1.editor.content.selectOffset(3);
    user1.editor.content.insert('[2]', {
      delay: 0,
    });
    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2]');
    });
    cy.then(() => {
      user2.editor.content.selectOffset(3);
      user2.editor.content.insert('[b]', {
        delay: 0,
      });
    });
    shouldContentHaveValue('[1][a][2][b]');

    //
    user1.editor.content.selectOffset(3);
    user1.editor.content.insert('[3]', {
      delay: 0,
    });
    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3]');
    });
    cy.then(() => {
      user2.editor.content.selectOffset(3);
      user2.editor.content.insert('[c]', {
        delay: 0,
      });
    });
    shouldContentHaveValue('[1][a][2][b][3][c]');

    //
    user1.editor.content.selectOffset(3);
    user1.editor.content.insert('[4]', {
      delay: 0,
    });
    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][c][4]');
    });
    cy.then(() => {
      user2.editor.content.selectOffset(3);
      user2.editor.content.insert('[d]', {
        delay: 0,
      });
    });
    shouldContentHaveValue('[1][a][2][b][3][c][4][d]');

    undoButton().click();
    shouldContentHaveValue('[1][a][2][b][3][c][d]');

    undoButton().click();
    shouldContentHaveValue('[1][a][2][b][c][d]');

    undoButton().click();
    shouldContentHaveValue('[1][a][b][c][d]');

    undoButton().click();
    shouldContentHaveValue('[a][b][c][d]');

    redoButton().click();
    shouldContentHaveValue('[1][a][b][c][d]');

    redoButton().click();
    shouldContentHaveValue('[1][a][2][b][c][d]');

    redoButton().click();
    shouldContentHaveValue('[1][a][2][b][3][c][d]');

    redoButton().click();
    shouldContentHaveValue('[1][a][2][b][3][c][4][d]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][c][4][d]');
    });
    cy.then(async () => {
      user2.collabService.service.undo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][b][3][c][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][c][4]');
    });
    cy.then(async () => {
      user2.collabService.service.undo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][b][3][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][4]');
    });
    cy.then(async () => {
      user2.collabService.service.undo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][3][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][3][4]');
    });
    cy.then(async () => {
      user2.collabService.service.undo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][2][3][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][2][3][4]');
    });
    cy.then(async () => {
      user2.collabService.service.redo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][3][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][3][4]');
    });
    cy.then(async () => {
      user2.collabService.service.redo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][b][3][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][4]');
    });
    cy.then(async () => {
      user2.collabService.service.redo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][b][3][c][4]');

    retry(() => {
      expect(user2.editor.content.value).to.equal('[1][a][2][b][3][c][4]');
    });
    cy.then(async () => {
      user2.collabService.service.redo();
      return user2.submitChanges();
    });
    shouldContentHaveValue('[1][a][2][b][3][c][4][d]');
  });
});

describe('with initial text', () => {
  let initialHeadRevision = 0;

  const contentValue = '[above]\n\n[below]\n';

  beforeEach(() => {
    cy.then(async () => {
      user2.editor.title.insert('lorem ipsum title', {
        noSubmit: true,
      });
      user2.editor.content.insert(contentValue, {
        noSubmit: true,
      });
      await user2.submitChanges();

      initialHeadRevision = user2.collabService.service.serverRevision;
    });
  });

  it('receives selection from user 2', () => {
    cy.visit(noteRoute());

    cy.then(() => {
      user2.editor.content.select(8);
      void user2.submitSelection();
    });

    shouldContentHaveValue('[above]\n\n[below]\n');
    shouldUser2CaretBeIndex('content', 8);
  });

  it('shows user 2 caret from recent record', () => {
    cy.visit(noteRoute());

    shouldContentHaveValue('[above]\n\n[below]\n');

    cy.then(() => {
      // [above]>\n\n[below]\n
      user2.editor.content.select(8);
      user2.editor.content.insert('a');
      void user2.submitChanges();
      // [above]a>\n\n[below]\n
    });

    shouldContentHaveValue('[above]\na\n[below]\n');
    shouldUser2CaretBeIndex('content', 9);
  });

  describe('concurrent typing without affecting other user', () => {
    interface User {
      select: number;
      insert: string;
      delay?: number;
    }

    interface Test {
      user1: Partial<User>;
      user2: Partial<User>;
      userA: Partial<User>;
      userB: Partial<User>;
    }

    const testSuite: Test[] = [
      {
        user1: {
          delay: 10,
          insert: '1',
        },
        user2: {
          insert: '2',
        },
        userA: {
          select: 17,
        },
        userB: {
          select: 8,
        },
      },
      {
        user1: {
          delay: 10,
          insert: 'user1:123',
        },
        user2: {
          insert: 'user2:abc',
        },
        userA: {
          select: 17,
        },
        userB: {
          select: 8,
        },
      },
      {
        user1: {
          delay: 1,
          select: 17,
          insert: '111111111111111111111111111111',
        },
        user2: {
          select: 8,
          insert: '22222222222',
        },
        userA: {
          select: 17,
        },
        userB: {
          select: 8,
        },
      },
    ];

    const inverseTestSuite: Test[] = testSuite.map((test) => ({
      ...test,
      userA: test.userB,
      userB: test.userA,
    }));

    const allTestSuite = [...testSuite, ...inverseTestSuite];

    allTestSuite.forEach((input) => {
      const userUI = {
        ...input.user1,
        ...input.userA,
      } as User;
      const userBG = {
        ...input.user2,
        ...input.userB,
      } as User;

      it(`userUI: "${userUI.insert}"@${userUI.select}~${userUI.delay}, userBG: "${userBG.insert}"@${userBG.select}`, () => {
        cy.visit(noteRoute());

        shouldHaveRevision(initialHeadRevision);

        cy.then(() => {
          user2.editor.content.select(userBG.select);
          user2.editor.content.insert(userBG.insert, {
            delay: userBG.delay,
          });
        });

        user1.editor.content.select(userUI.select);
        user1.editor.content.insert(userUI.insert, {
          delay: userUI.delay,
        });

        if (userBG.select < userUI.select) {
          shouldContentHaveValue(
            contentValue.slice(0, userBG.select) +
              userBG.insert +
              contentValue.slice(userBG.select, userUI.select) +
              userUI.insert +
              contentValue.slice(userUI.select)
          );
          shouldUser2CaretBeIndex('content', userBG.select + userBG.insert.length);
          shouldContentCaretBeIndex(
            userUI.select + userBG.insert.length + userUI.insert.length
          );
        } else {
          shouldContentHaveValue(
            contentValue.slice(0, userUI.select) +
              userUI.insert +
              contentValue.slice(userUI.select, userBG.select) +
              userBG.insert +
              contentValue.slice(userBG.select)
          );
          shouldContentCaretBeIndex(userUI.select + userUI.insert.length);
          shouldUser2CaretBeIndex(
            'content',
            userBG.select + userUI.insert.length + userBG.insert.length
          );
        }
      });
    });
  });
});

describe('with history', () => {
  let initialHeadRevision = 0;

  beforeEach(() => {
    cy.then(async () => {
      user1.bgEditor.content.insert('[before]\n\n[history]\n\n\n[after]\n', {
        delay: 0,
      });

      user1.bgEditor.content.select(20);
      user1.bgEditor.content.insert('[t1]', {
        delay: 0,
      });
      user1.bgEditor.content.insert('[t2]', {
        delay: 0,
      });
      user1.bgEditor.content.insert('[t3]', {
        delay: 0,
      });

      await user1.bgQueuedChangesSubmitted();

      initialHeadRevision = user1.collabService.service.serverRevision;

      // [before]\n\n[history]\n[t1][t2][t3]\n\n[after]\n
    });
  });

  it('can undo x1 while receiving changes from user2', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.then(() => {
      user2.editor.content.select(9);
      user2.editor.content.insert('12345');
    });

    undoButton().click();

    shouldContentHaveValue('[before]\n12345\n[history]\n[t1][t2]\n\n[after]\n');
  });

  it('can undo x3 while receiving changes from user2', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.then(() => {
      user2.editor.content.select(9);
      user2.editor.content.insert('1234567');
    });

    undoButton().click();
    undoButton().click();
    undoButton().click();

    shouldContentHaveValue('[before]\n1234567\n[history]\n\n\n[after]\n');
  });

  it('can undo all changes while receiving changes from user2', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.then(() => {
      user2.editor.content.select(9);
      user2.editor.content.insert('12345');
    });

    undoButton().click();
    undoButton().click();
    undoButton().click();
    undoButton().click();

    undoButton().should('be.disabled');
    shouldContentHaveValue('12345');
  });

  it('type, delete, redo while receiving changes from user2', () => {
    cy.clock();

    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.tick(100);

    // [before]\n\n[history]\n[t1][t2][t3]>\n\n[after]\n

    user1.editor.content.select(32);

    user1.editor.content.insert('abc'); // type abc
    // [before]\n\n[history]\n[t1][t2][t3]abc>\n\n[after]\n

    cy.tick(100);

    cy.then(() => {
      user2.editor.content.select(9);
      user2.editor.content.insert('12345');
    });
    // [before]\n12345\n[history]\n[t1][t2][t3]abc>\n\n[after]\n

    user1.editor.content.selectOffset(-7);

    user1.editor.content.delete(4); // delete [t2]
    cy.tick(5000);
    // [before]\n12345\n[history]\n[t1]>[t3]abc\n\n[after]\n

    cy.then(() => {
      user2.editor.content.delete(2);
    });
    // [before]\n123\n[history]\n[t1]>[t3]abc\n\n[after]\n

    user1.editor.content.delete(4); // delete [t1]
    cy.tick(5000);
    // [before]\n123\n[history]\n>[t3]abc\n\n[after]\n

    shouldContentHaveValue('[before]\n123\n[history]\n[t3]abc\n\n[after]\n');

    cy.tick(100);

    undoButton().click(); // +[t1]
    undoButton().click(); // +[t2]
    undoButton().click(); // -abc

    shouldContentHaveValue('[before]\n123\n[history]\n[t1][t2][t3]\n\n[after]\n');
  });

  it('user2 deletes most history entries', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    // [before]\n\n[history]\n[t1][t2][t3]>\n\n[after]\n

    cy.then(() => {
      user2.editor.content.select(32);
      user2.editor.content.delete(12, {
        delay: 0,
      });
      user2.editor.content.select(9);
      user2.editor.content.insert('123');
    });

    noteDialog()
      .find('[aria-label="content"] textarea')
      .should('not.contain.value', '[t1][t2][t3]');

    undoButton().click();

    shouldContentHaveValue('123');

    user1.editor.content.select(0);
    user1.editor.content.insert('a');
    shouldContentHaveValue('a123');

    undoButton().click();
    shouldContentHaveValue('123');
  });
});

describe('with generated actions', () => {
  const config = {
    tests: [
      {
        seed: 896,
        count: 34,
      },
      {
        seed: 67905,
        count: 50,
      },
    ],
    insertLength: {
      min: 1,
      max: 9,
    },
    deleteCount: {
      min: 1,
      max: 6,
    },
    user: [
      {
        weight: 6,
        value: 'UI',
      },
      {
        weight: 4,
        value: 'BG',
      },
    ],
    field: [
      {
        weight: 2,
        value: 'title' satisfies Field,
      },
      {
        weight: 8,
        value: 'content' satisfies Field,
      },
    ],
    typingDelay: [
      {
        weight: 20,
        value: 0,
      },
      {
        weight: 10,
        value: 1,
      },
      {
        weight: 66,
        value: 10,
      },
      {
        weight: 2,
        value: 300,
      },
    ],
    newLineProbability: 0.6,
    waitForSeparateHistoryRecordProbability: 0.2,
  };

  let users: {
    name: string;
    context: UserContext;
  }[];

  function findUser(name: string) {
    const user = users.find((user) => user.name === name);
    if (!user) {
      throw new Error(`Failed to find user ${name}`);
    }
    return user;
  }

  interface Action {
    name: string;
    generateInput?: () => any[];
    invoke: (...args: any[]) => void;
  }

  const actions: {
    weight: number;
    value: Action;
  }[] = [
    {
      weight: 40,
      value: {
        name: 'select',
        generateInput: () => {
          const userName = faker.helpers.weightedArrayElement(config.user);
          const field = faker.helpers.weightedArrayElement(config.field);

          const start = Math.round(faker.number.float() * 100) / 100;
          const end =
            Math.round(
              faker.number.float({
                min: start,
                max: 1,
              }) * 100
            ) / 100;

          return [userName, field, start, end];
        },
        invoke: (
          userName: string,
          field: Field,
          startRatio: number,
          endRatio: number
        ) => {
          const user = findUser(userName);
          const editor = user.context.editor[field];
          editor.getValue().then((value) => {
            editor.select(
              Math.floor(startRatio * value.length),
              Math.floor(endRatio * value.length)
            );
          });
        },
      },
    },
    {
      weight: 110,
      value: {
        name: 'type',
        generateInput: () =>
          [
            faker.helpers.weightedArrayElement(config.user),
            faker.helpers.weightedArrayElement(config.field),
            faker.helpers.weightedArrayElement(config.typingDelay),
            faker.word.sample({
              length: config.insertLength,
              strategy: 'closest',
            }),
            faker.helpers.maybe(() => true, {
              probability: config.newLineProbability,
            }),
            faker.helpers.maybe(() => true, {
              probability: config.waitForSeparateHistoryRecordProbability,
            }),
          ] as const,
        invoke: (
          userName: string,
          field: Field,
          delay: number,
          input: string,
          newLine: true | undefined,
          tick: true | undefined
        ) => {
          const user = findUser(userName);
          const editor = user.context.editor[field];
          editor.insert(input + (newLine ? '\n' : ''), { delay });
          if (user.context.type === 'interface' && tick) {
            cy.tick(5000);
          }
        },
      },
    },
    {
      weight: 75,
      value: {
        name: 'delete',
        generateInput: () =>
          [
            faker.helpers.weightedArrayElement(config.user),
            faker.helpers.weightedArrayElement(config.field),
            faker.helpers.weightedArrayElement(config.typingDelay),
            faker.number.int(config.deleteCount),
            faker.helpers.maybe(() => true, {
              probability: config.waitForSeparateHistoryRecordProbability,
            }),
          ] as const,
        invoke: (
          userName: string,
          field: Field,
          delay: number,
          input: number,
          tick: true | undefined
        ) => {
          const user = findUser(userName);
          const editor = user.context.editor[field];

          editor.delete(input, { delay });
          if (user.context.type === 'interface' && tick) {
            cy.tick(5000);
          }
        },
      },
    },
    {
      weight: 50,
      value: {
        name: 'undo',
        generateInput: () => [faker.helpers.weightedArrayElement(config.user)] as const,
        invoke: (userName: string) => {
          const user = findUser(userName);
          const service = user.context.collabService.service;

          service.undo();
        },
      },
    },
    {
      weight: 30,
      value: {
        name: 'redo',
        generateInput: () => [faker.helpers.weightedArrayElement(config.user)] as const,
        invoke: (userName: string) => {
          const user = findUser(userName);
          const service = user.context.collabService.service;

          service.undo();
        },
      },
    },
    {
      weight: 1,
      value: {
        name: 'reload',
        invoke: () => {
          cy.visit(noteRoute());
        },
      },
    },
  ];

  beforeEach(() => {
    users = [
      {
        name: 'UI',
        context: user1,
      },
      {
        name: 'BG',
        context: user2,
      },
    ];
  });

  config.tests.forEach(({ count: actionsCount, seed }, index) => {
    it(`test ${index}, actions: ${actionsCount}`, () => {
      // TODO failing test, copy state and external change and reproduce the error in unit test
      // TODO also ensure external change is not invalid
      // TODO also get server records in mongodb...
      cy.enableDebug();

      faker.seed(seed);

      cy.clock();

      cy.visit(noteRoute());

      shouldHaveRevision(1);

      cy.clock(10000);
      // /user2:|error/
      for (let i = 0; i < actionsCount; i++) {
        const action = faker.helpers.weightedArrayElement(actions);
        const input = action.generateInput?.() ?? [];
        cy.log(`${i} ${action.name}: ${JSON.stringify(input)}`);
        cy.then(() => {
          action.invoke(...input);
        });
        cy.tick(100);
      }

      cy.tick(5000);

      cy.then(() => user2.ongoingChangesPromise());

      cy.tick(5000);

      shouldAppStatusEqual(['synchronized', 'refresh']);
    });
  });
});
