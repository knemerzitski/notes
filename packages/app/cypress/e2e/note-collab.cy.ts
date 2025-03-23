/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt from 'mitt';

import { CollabService } from '../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../collab/src/client/selection-range';
import { SimpleText } from '../../../collab/src/types';

import { NoteTextFieldName } from '../../src/__generated__/graphql';
import { GraphQLService } from '../../src/graphql/types';
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
import { createLogger } from '../../../utils/src/logging';
import { faker } from '@faker-js/faker';
import { AppStatus } from '../../src/utils/hooks/useAppStatus';

interface UserContext {
  userId: string;
  type: 'interface' | 'background';
  graphQLService: GraphQLService;
  collabService: {
    service: CollabService;
    fields: Record<NoteTextFieldName, SimpleText>;
  };
  editor: Record<Field, FieldEditor>;
  submitChanges: () => Promise<void>;
}

interface TextOperationOptions {
  delay?: number;
  /**
   * Don't queue operation for submission.
   * @default false
   */
  noSubmit?: boolean;
}

interface FieldEditor {
  getValue(): PromiseLike<string>;
  insert(value: string, options?: TextOperationOptions): void;
  delete(count: number, options?: TextOperationOptions): void;
  select(start: number, end?: number, options?: TextOperationOptions): void;
  selectOffset(offset: number, options?: TextOperationOptions): void;
}

type TextOperation = (
  | {
      type: 'insert';
      value: string;
    }
  | {
      type: 'delete';
      count: number;
    }
  | {
      type: 'selectOffset';
      offset: SelectionRange;
    }
) & {
  options?: TextOperationOptions;
};

class SimpleTextField implements FieldEditor {
  private _eventBus = mitt<{
    selectionChanged: undefined;
    doneExecutingOperations: undefined;
  }>();
  get eventBus(): Pick<typeof this._eventBus, 'on' | 'off'> {
    return this._eventBus;
  }

  private selection = SelectionRange.ZERO;
  private selectionRevision: number;

  private isExeceutingOperations = false;
  private operationQueue: TextOperation[] = [];
  private prevOperationTime = 0;

  constructor(
    private readonly field: SimpleText,
    private readonly service: CollabService,
    private readonly submitChanges: () => Promise<void>
  ) {
    this.field.eventBus.on('selectionChanged', (newSelection) => {
      this.selection = newSelection;
    });

    field.eventBus.on('selectionChanged', (selection) => {
      this.selection = selection;
      this.selectionRevision = service.headRevision;
    });

    field.eventBus.on('handledExternalChanges', (changesets) => {
      const newSelection = changesets.reduce(
        (sel, { changeset }) => SelectionRange.closestRetainedPosition(sel, changeset),
        this.selection
      );

      this.selection = newSelection;
      this.selectionRevision = this.service.headRevision;
    });
  }

  getValue() {
    return Promise.resolve(this.field.value);
  }

  private _insert(value: string, options?: TextOperationOptions) {
    if (options?.noSubmit) {
      this.field.insert(value, this.selection);
    } else {
      this.pushOperation({
        type: 'insert',
        value,
        options,
      });
    }
  }

  insert(value: string, options?: TextOperationOptions) {
    const delay = options?.delay ?? 10;
    if (delay <= 0) {
      this._insert(value, options);
    } else {
      value.split('').forEach((char) => {
        this._insert(char, {
          ...options,
          delay,
        });
      });
    }
  }

  _delete(count: number, options?: TextOperationOptions) {
    if (options?.noSubmit) {
      this.field.delete(count, this.selection);
    } else {
      this.pushOperation({
        type: 'delete',
        count,
        options,
      });
    }
  }

  delete(count: number, options?: TextOperationOptions) {
    const delay = options?.delay ?? 10;
    if (delay <= 0) {
      this._delete(count, options);
    } else {
      [...new Array<undefined>(count)].forEach(() => {
        this._delete(1, options);
      });
    }
  }

  select(start: number, end?: number, options?: Omit<TextOperationOptions, 'noSubmit'>) {
    this.pushOperation({
      type: 'selectOffset',
      offset: SelectionRange.subtract(SelectionRange.from(start, end), this.selection),
      options,
    });
  }

  selectOffset(offset: number, options?: Omit<TextOperationOptions, 'noSubmit'>) {
    this.pushOperation({
      type: 'selectOffset',
      offset: SelectionRange.from(offset),
      options,
    });
  }

  executingOperations() {
    return new Promise<void>((res) => {
      if (this.operationQueue.length === 0) {
        res();
      } else {
        const off = this._eventBus.on('doneExecutingOperations', () => {
          off();
          res();
        });
      }
    });
  }

  private pushOperation(op: TextOperation) {
    this.operationQueue.push(op);
    void this.executeAllQueuedOperations();
  }

  /**
   * Execute operations one at a time waiting for submitted record to be acknowledged
   */
  private async executeAllQueuedOperations() {
    if (this.isExeceutingOperations) {
      return;
    }

    this.isExeceutingOperations = true;
    try {
      let op: TextOperation | undefined;
      while ((op = this.operationQueue.shift()) !== undefined) {
        const delay = op.options?.delay ?? 0;

        const timeElapsed = Date.now() - this.prevOperationTime;
        const timeout = delay - timeElapsed;

        if (timeout > 0) {
          await new Promise((res) => {
            setTimeout(res, timeout);
          });
        }

        // Wait for submitted ack
        if (this.service.haveSubmittedChanges()) {
          await new Promise((res) => {
            const off = user2.collabService.service.eventBus.on(
              'submittedChangesAcknowledged',
              () => {
                off();
                res(true);
              }
            );
          });
        }

        this.prevOperationTime = Date.now();

        if (op.type === 'insert') {
          this.field.insert(op.value, this.selection);
          await this.submitChanges();
        } else if (op.type === 'delete') {
          this.field.delete(op.count, this.selection);
          await this.submitChanges();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (op.type === 'selectOffset') {
          const newSelection = SelectionRange.add(this.selection, op.offset);
          if (!SelectionRange.isEqual(this.selection, newSelection)) {
            this.selection = newSelection;
            this.selectionRevision = this.service.headRevision;
            this._eventBus.emit('selectionChanged');
          }
        }
      }
    } finally {
      this.isExeceutingOperations = false;
      this._eventBus.emit('doneExecutingOperations');
    }
  }

  getServiceSelection() {
    return {
      revision: this.selectionRevision,
      selection: this.field.transformToServiceSelection(this.selection),
    };
  }
}

class CyElementField implements FieldEditor {
  constructor(private readonly getChainableEl: () => Cypress.Chainable<JQuery>) {}

  getValue() {
    return this.getChainableEl()
      .invoke('val')
      .then((value) => {
        if (typeof value !== 'string') {
          throw new Error(`Unexpected value is not string "${String(value)}"`);
        }
        return value;
      });
  }

  insert(value: string, _options?: TextOperationOptions) {
    this.getChainableEl().type(value);
  }

  delete(count: number, _options?: TextOperationOptions) {
    this.getChainableEl().type('{backspace}'.repeat(count));
  }

  selectOffset(offset: number, _options?: TextOperationOptions): void {
    this.getChainableEl().moveSelectionRange(offset);
  }

  select(start: number, end?: number, _options?: TextOperationOptions) {
    const selection = SelectionRange.from(start, end);
    this.getChainableEl().setSelectionRange(selection.start, selection.end);
  }

  type(value: string, options?: TextOperationOptions) {
    this.getChainableEl().type(value, options);
  }
}

const fields = ['title', 'content'] as const;
type Field = (typeof fields)[number];

let user1: UserContext & {
  bgEditor: Record<Field, FieldEditor>;
  bgQueuedChangesSubmitted: () => Promise<void>;
};

let user2: UserContext & {
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

    const { fields, collabService } = createCollabService({
      graphQLService,
      noteId,
    });

    const _submitChanges = async () => {
      await submitChanges({
        collabService,
        graphQLService,
        noteId,
      });
    };

    const bgEditor = {
      title: new SimpleTextField(
        fields[NoteTextFieldName.TITLE],
        collabService,
        _submitChanges
      ),
      content: new SimpleTextField(
        fields[NoteTextFieldName.CONTENT],
        collabService,
        _submitChanges
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
      bgQueuedChangesSubmitted: async () => {
        await Promise.all(Object.values(bgEditor).map((e) => e.executingOperations()));
      },
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
      storageKey: `apollo:cache:test:user2:${nextStorageKeyCounter++}`,
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

      const { fields, collabService } = createCollabService({
        graphQLService,
        noteId,
      });

      const _submitChanges = async () => {
        await submitChanges({
          collabService,
          graphQLService,
          noteId,
        });
      };

      const testEditorByName = {
        title: new SimpleTextField(
          fields[NoteTextFieldName.TITLE],
          collabService,
          _submitChanges
        ),
        content: new SimpleTextField(
          fields[NoteTextFieldName.CONTENT],
          collabService,
          _submitChanges
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
        ongoingChangesPromise: async () => {
          await Promise.all(
            Object.values(testEditorByName).map((e) => e.executingOperations())
          );
        },
        submitChanges: _submitChanges,
        submitSelection: async () => {
          const testEditor = lastSelectedTestEditor;
          if (!testEditor) {
            return;
          }

          const serviceSelection = testEditor.getServiceSelection();

          await updateOpenNoteSelectionRange({
            graphQLService,
            noteId,
            selectionRange: serviceSelection.selection,
            revision: serviceSelection.revision,
          });
        },
      };
    });

    await persistCache(graphQLService);
  });
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    .find('[aria-label="collab-service"]')
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

      initialHeadRevision = user2.collabService.service.headRevision;
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

      initialHeadRevision = user1.collabService.service.headRevision;

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

    undoButton().click();

    shouldContentHaveValue('123');

    user1.editor.content.insert('a');
    shouldContentHaveValue('123a');

    undoButton().click();
    shouldContentHaveValue('123');
  });
});

describe('generated actions', () => {
  // TODO update config with more tests
  const config = {
    seed: 4325,
    testCount: 1,
    actionsPerTest: {
      min: 10,
      max: 10,
    },
    insertLength: {
      min: 1,
      max: 9,
    },
    deleteCount: {
      min: 1,
      max: 6,
    },
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
    waitForSeparateHistoryRecordProbability: 0.2,
  };

  let users: {
    name: string;
    context: UserContext;
  }[];
  let userNames: string[];

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
          const userName = faker.helpers.arrayElement(userNames);
          const field = faker.helpers.arrayElement(fields);

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
            faker.helpers.arrayElement(userNames),
            faker.helpers.arrayElement(fields),
            faker.helpers.weightedArrayElement(config.typingDelay),
            faker.word.sample({
              length: config.insertLength,
              strategy: 'closest',
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
          tick: true | undefined
        ) => {
          const user = findUser(userName);
          const editor = user.context.editor[field];
          editor.insert(input, { delay });
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
            faker.helpers.arrayElement(userNames),
            faker.helpers.arrayElement(fields),
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
      weight: 1,
      value: {
        name: 'reload',
        invoke: () => {
          cy.visit(noteRoute());
        },
      },
    },
  ];

  before(() => {
    faker.seed(config.seed);
  });

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
    userNames = users.map((user) => user.name);
  });

  [...new Array<undefined>(config.testCount)].forEach((_, index) => {
    // TODO inputs inside test message?
    it(`test ${index}`, () => {
      cy.clock();

      cy.visit(noteRoute());

      shouldHaveRevision(1);

      const n = faker.number.int(config.actionsPerTest);
      cy.log(`actionsCount: ${n}`);
      for (let i = 0; i < n; i++) {
        const action = faker.helpers.weightedArrayElement(actions);
        const input = action.generateInput?.() ?? [];
        cy.log(`${i} ${action.name}: ${JSON.stringify(input)}`);
        // cy.then(() => {
        action.invoke(...input);
        // });
        cy.tick(100);

        // todo check that user 2 avatar is visible
      }

      cy.tick(10000);

      shouldAppStatusEqual(['synchronized', 'refresh']);
    });
  });
});
