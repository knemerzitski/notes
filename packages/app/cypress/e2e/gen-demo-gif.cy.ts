/* eslint-disable cypress/no-unnecessary-waiting */
 
 
 
import { MaybePromise } from '../../../utils/src/types';

import { ColorMode } from '../../src/__generated__/graphql';
import { setColorMode } from '../../src/device-preferences/models/color-mode/set';
import { NoteTextFieldName } from '../../src/note/types';
import { CyElementField } from '../support/e2e/collab-users/cy-element-field';
import { SimpleTextField } from '../support/e2e/collab-users/simple-text-field';
import { SimpleTextFieldsOperationsQueue } from '../support/e2e/collab-users/simple-text-fields-operations-queue';
import { Field } from '../support/e2e/collab-users/types';
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

let nextStorageKeyCounter = 0;

type UIUserContext = Awaited<ReturnType<typeof createUIUserContext>>;

async function createUIUserContext({
  signInOptions,
  noteOptions,
}: {
  signInOptions: Omit<Parameters<typeof signIn>[0], 'graphQLService'>;
  noteOptions?: Omit<Parameters<typeof createNote>[0], 'graphQLService' | 'userId'>;
}) {
  // Init user, who will be displayed in UI
  const graphQLService = await createGraphQLService();

  // Sign in
  const { userId } = await signIn({
    ...signInOptions,
    graphQLService,
  });

  // Create note
  const { noteId } = await createNote({
    ...noteOptions,
    graphQLService,
    userId,
  });

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
    content: new SimpleTextField(fields[NoteTextFieldName.CONTENT], collabService, queue),
  };

  // Create link to share note
  const { shareAccessId } = await shareNote({
    userId,
    noteId,
    graphQLService,
  });

  return {
    userId,
    noteId,
    shareAccessId,
    type: 'interface',
    editor: {
      title: new CyElementField(() => titleField(noteId)),
      content: new CyElementField(() => contentField(noteId)),
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
}

type BGUserContext = Awaited<ReturnType<typeof createBGUserContext>>;

async function createBGUserContext({
  signInOptions,
  noteId,
  shareAccessId,
}: Pick<UIUserContext, 'shareAccessId' | 'noteId'> & {
  signInOptions: Omit<Parameters<typeof signIn>[0], 'graphQLService'>;
}) {
  // Init user, who will be programmatically controlled in the background
  const graphQLService = await createGraphQLService({
    storageKeyPrefix: `test:bgUser:${nextStorageKeyCounter++}:`,
  });

  const { userId } = await signIn({
    ...signInOptions,
    graphQLService,
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

  // Ensure user has up to date headText
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
    content: new SimpleTextField(fields[NoteTextFieldName.CONTENT], collabService, queue),
  };

  let lastSelectedTestEditor: SimpleTextField | null;
  Object.values(testEditorByName).forEach((testEditor) => {
    testEditor.eventBus.on('selectionChanged', () => {
      lastSelectedTestEditor = testEditor;
    });
  });

  return {
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
}

function noteRoute(noteId: string) {
  return `/note/${encodeURIComponent(noteId)}`;
}

function noteDialog(noteId: string) {
  return cy.get(`[aria-label="note dialog"][data-note-id="${noteId}"]`);
}

function titleField(noteId: string) {
  return noteDialog(noteId).find('[aria-label="title"] input');
}

function contentField(noteId: string) {
  return noteDialog(noteId).find('[aria-label="content"] textarea').eq(0);
}

function undoButton(noteId: string) {
  return noteDialog(noteId).find('[aria-label="history undo"]');
}

function redoButton(noteId: string) {
  return noteDialog(noteId).find('[aria-label="history redo"]');
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
  return cy.then(async () => {
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

async function insertDelayed(
  ctx: BGUserContext,
  fieldName: Field,
  values: string[],
  delay: number
) {
  for (const value of values) {
    ctx.editor[fieldName].insert(value, { noSubmit: true });
    await ctx.submitChanges();
    await new Promise((res) => {
      setTimeout(res, delay);
    });
  }
}

it('generate gif for demo', () => {
  cy.resetDatabase();

  let uiAlice: UIUserContext;
  let bgBob: BGUserContext;
  let bgCarol: BGUserContext;
  let noteId: string;
  cy.then(async () => {
    uiAlice = await createUIUserContext({
      signInOptions: {
        signInUserId: 'ui',
        displayName: 'Alice_',
      },
      noteOptions: {
        initialText: {
          [NoteTextFieldName.CONTENT]: '\n\n\n',
        },
      },
    });

    noteId = uiAlice.noteId;

    bgBob = await createBGUserContext({
      signInOptions: {
        signInUserId: 'bg1',
        displayName: 'Bobby',
      },
      noteId,
      shareAccessId: uiAlice.shareAccessId,
    });

    bgCarol = await createBGUserContext({
      signInOptions: {
        signInUserId: 'bg2',
        displayName: 'Carol',
      },
      noteId,
      shareAccessId: uiAlice.shareAccessId,
    });
  });

  cy.then(() => {
    cy.then(() => {
      // Enforce dark mode for UI user
      setColorMode(ColorMode.DARK, uiAlice.graphQLService.client.cache);
    });
    cy.then(() => persistCache(uiAlice.graphQLService));

    cy.visit(noteRoute(noteId), {
      // Enforce dark mode for UI user on initial load
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'bootstrap:app',
          JSON.stringify({
            colorMode: 'DARK',
          })
        );
      },
    });

    uiAlice.editor.content.select(0);
    bgBob.editor.content.select(1);
    bgCarol.editor.content.select(2);

    cy.wait(1000);

    cy.then(() => {
      uiAlice.editor.content.insert('Hello from Alice, this is a collaborative note.', {
        delay: 5,
      });

      // Bob starts typing concurrently
      void insertDelayed(
        bgBob,
        'content',
        ['Hi,', " I'm Bob.", ' Multiple', ' ysers', ' can edit', ' together.'],
        140
      );

      // Carol concurrenly fixes typo "ysers" -> "users"
      retry(() => {
        expect(bgCarol.editor.content.value).to.contain('ysers');
      })
        .then(async () => {
          const value = bgCarol.editor.content.value;
          const index = value.indexOf('ysers');
          bgCarol.editor.content.select(index + 1);
          await new Promise((res) => {
            setTimeout(res, 400);
          });
          bgCarol.editor.content.delete(1);
          await new Promise((res) => {
            setTimeout(res, 200);
          });
          await insertDelayed(bgCarol, 'content', ['u'], 300);
        })
        .then(() => {
          // Carol replaces "together" with "in real time"
          retry(() => {
            expect(bgCarol.editor.content.value).to.contain('users can edit together.');
          }).then(async () => {
            const value = bgCarol.editor.content.value;
            const index = value.indexOf('edit together.');
            bgCarol.editor.content.select(index + 5, index + 13);
            await insertDelayed(bgCarol, 'content', ['in', ' real', ' time'], 250);
          });
        })
        .then(async () => {
          // Carol types "Try it yourself!"
          await new Promise((res) => {
            setTimeout(res, 1000);
          });
          bgCarol.editor.content.select(-1);
          void insertDelayed(bgCarol, 'content', ['Try', ' it', ' yourself', '!'], 600);
        });

      // Alice types to title then undos are redos history
      uiAlice.editor.title.insert('Title shareS', {
        delay: 20,
      });
      cy.wait(100);
      uiAlice.editor.title.delete(1);
      uiAlice.editor.title.insert('s');
      cy.wait(200);
      uiAlice.editor.title.insert(' history', {
        delay: 20,
      });

      cy.wait(100);
      undoButton(noteId).click();
      cy.wait(100);
      undoButton(noteId).click();
      cy.wait(100);
      undoButton(noteId).click();
      cy.wait(100);
      undoButton(noteId).click();

      cy.wait(500);
      redoButton(noteId).click();
      cy.wait(50);
      redoButton(noteId).click();
      cy.wait(50);
      redoButton(noteId).click();
      cy.wait(50);
      redoButton(noteId).click();

      cy.wait(2000);
    });
  });
});
