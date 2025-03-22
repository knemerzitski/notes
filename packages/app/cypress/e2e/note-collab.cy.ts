/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mapObject from 'map-obj';

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

interface UserContext {
  userId: string;
  graphQLService: GraphQLService;
  collabService: {
    service: CollabService;
    fields: Record<NoteTextFieldName, SimpleText>;
  };
}

interface FieldEditor {
  insert(value: string): void;
  delete(count: number): void;
  select(start: number, end?: number): void;
  type(
    value: string,
    options?: {
      delay?: number;
    }
  ): void;
}

class SimpleTextField implements FieldEditor {
  private _eventBus = mitt<{
    selectionChanged: undefined;
  }>();
  get eventBus(): Pick<typeof this._eventBus, 'on' | 'off'> {
    return this._eventBus;
  }

  private selection = SelectionRange.ZERO;
  private selectionRevision: number;

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

  insert(value: string) {
    this.field.insert(value, this.selection);
  }

  delete(count: number) {
    this.field.delete(count, this.selection);
  }

  select(start: number, end?: number) {
    const newSelection = SelectionRange.from(start, end);
    if (SelectionRange.isEqual(this.selection, newSelection)) {
      return;
    }

    this.selection = newSelection;
    this.selectionRevision = this.service.headRevision;

    this._eventBus.emit('selectionChanged');
  }

  /**
   * Type one character at a time as a record, waiting for submitted record to be acknowledged
   */
  type(value: string, options?: Parameters<FieldEditor['type']>[1]) {
    const delay = options?.delay ?? 0;
    let prevInsertTime = 0;

    const charQueue = value.split('');

    const submitNextChar = async () => {
      const timeElapsed = Date.now() - prevInsertTime;
      const timeout = delay - timeElapsed;

      if (timeout > 0) {
        await new Promise((res) => {
          setTimeout(res, timeout);
        });
      }

      const nextChar = charQueue.shift();
      if (nextChar == null) {
        return;
      }

      if (!this.service.haveSubmittedChanges()) {
        this.insert(nextChar);
        prevInsertTime = Date.now();
        void this.submitChanges().then(submitNextChar);
        return;
      }

      const off = user2.collabService.service.eventBus.on(
        'submittedChangesAcknowledged',
        () => {
          this.insert(nextChar);
          prevInsertTime = Date.now();
          void this.submitChanges().then(submitNextChar);
          off();
        }
      );
    };

    void submitNextChar();
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

  insert(value: string) {
    this.getChainableEl().type(value);
  }

  delete(count: number) {
    this.getChainableEl().type('{backspace}'.repeat(count));
  }

  select(start: number, end?: number) {
    const selection = SelectionRange.from(start, end);
    this.getChainableEl().setSelectionRange(selection.start, selection.end);
  }

  type(value: string, options?: Parameters<FieldEditor['type']>[1]) {
    this.getChainableEl().type(value, options);
  }
}

let user1: UserContext & {
  editor: Record<NoteTextFieldName, FieldEditor>;
  bgEditor: Record<NoteTextFieldName, FieldEditor>;
  submitChanges: () => Promise<void>;
};

let user2: UserContext & {
  editor: Record<NoteTextFieldName, FieldEditor>;
  submitChanges: () => Promise<void>;
  submitSelection: () => Promise<void>;
};
let noteId: string;
let shareAccessId: string;

let nextStorageKeyCounter = 0;

beforeEach(() => {
  cy.resetDatabase();

  cy.then(async () => {
    // Init user 1, who will be displayed in UI
    const graphQLService = await createGraphQLService();

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

    user1 = {
      userId,
      editor: {
        [NoteTextFieldName.TITLE]: new CyElementField(titleField),
        [NoteTextFieldName.CONTENT]: new CyElementField(contentField),
      },
      bgEditor: mapObject(fields, (key, value) => [
        key,
        new SimpleTextField(value, collabService, _submitChanges),
      ]),
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

      const testEditorByName = mapObject(fields, (key, value) => [
        key,
        new SimpleTextField(value, collabService, _submitChanges),
      ]);

      let lastSelectedTestEditor: SimpleTextField | null;
      Object.values(testEditorByName).forEach((testEditor) => {
        testEditor.eventBus.on('selectionChanged', () => {
          lastSelectedTestEditor = testEditor;
        });
      });

      user2 = {
        userId,
        graphQLService,
        collabService: {
          service: collabService,
          fields,
        },
        editor: testEditorByName,
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

describe('with empty text', () => {
  it('receives text from user 2', () => {
    cy.visit(noteRoute());

    cy.then(() => {
      user2.editor.CONTENT.insert('foobar');
      void user2.submitChanges();
    });

    shouldContentHaveValue('foobar');
  });
});

describe('with initial text', () => {
  let initialHeadRevision = 0;

  const contentValue = '[above]\n\n[below]\n';

  beforeEach(() => {
    cy.then(async () => {
      user2.editor.TITLE.insert('lorem ipsum title');
      user2.editor.CONTENT.insert(contentValue);
      await user2.submitChanges();

      initialHeadRevision = user2.collabService.service.headRevision;
    });
  });

  it('receives selection from user 2', () => {
    cy.visit(noteRoute());

    cy.then(() => {
      user2.editor.CONTENT.select(8);
      void user2.submitSelection();
    });

    shouldContentHaveValue('[above]\n\n[below]\n');
    shouldUser2CaretBeIndex('content', 8);
  });

  it('shows user 2 caret from recent record', () => {
    cy.visit(noteRoute());

    cy.then(() => {
      // [above]>\n\n[below]\n
      user2.editor.CONTENT.select(8);
      user2.editor.CONTENT.insert('a');
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
          user2.editor.CONTENT.select(userBG.select);
          user2.editor.CONTENT.type(userBG.insert, {
            delay: userBG.delay,
          });
        });

        user1.editor.CONTENT.select(userUI.select);
        user1.editor.CONTENT.type(userUI.insert, {
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
      user1.bgEditor.CONTENT.insert('[before]\n\n[history]\n\n\n[after]\n');
      await user1.submitChanges();

      user1.bgEditor.CONTENT.select(20);
      user1.bgEditor.CONTENT.insert('[t1]');
      await user1.submitChanges();

      user1.bgEditor.CONTENT.insert('[t2]');
      await user1.submitChanges();

      user1.bgEditor.CONTENT.insert('[t3]');
      await user1.submitChanges();

      initialHeadRevision = user1.collabService.service.headRevision;

      // [before]\n\n[history]\n[t1][t2][t3]\n\n[after]\n
    });
  });

  it('can undo x1 while receiving changes from user2', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.then(() => {
      user2.editor.CONTENT.select(9);
      user2.editor.CONTENT.type('12345');
    });

    undoButton().click();

    shouldContentHaveValue('[before]\n12345\n[history]\n[t1][t2]\n\n[after]\n');
  });

  it('can undo x3 while receiving changes from user2', () => {
    cy.visit(noteRoute());

    shouldHaveRevision(initialHeadRevision);

    cy.then(() => {
      user2.editor.CONTENT.select(9);
      user2.editor.CONTENT.type('1234567');
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
      user2.editor.CONTENT.select(9);
      user2.editor.CONTENT.type('12345');
    });

    undoButton().click();
    undoButton().click();
    undoButton().click();
    undoButton().click();

    undoButton().should('be.disabled');
    shouldContentHaveValue('12345');
  });
});
