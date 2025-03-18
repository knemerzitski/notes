/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mapObject from 'map-obj';
import { CollabService } from '../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../collab/src/client/selection-range';
import { SimpleText } from '../../../collab/src/types';
import { NoteTextFieldName } from '../../src/__generated__/graphql';
import { GraphQLService } from '../../src/graphql/types';
import mitt from 'mitt';

interface UserContext {
  userId: string;
  graphQLService: GraphQLService;
  collabService: {
    service: CollabService;
    fields: Record<NoteTextFieldName, SimpleText>;
  };
  editor: Record<NoteTextFieldName, FieldEditor>;
  submitChanges: () => Promise<void>;
  submitSelection: () => Promise<void>;
}

interface FieldEditor {
  insert(value: string): void;
  delete(count: number): void;
  select(start: number, end?: number): void;
}

class SimpleTextField implements FieldEditor {
  private _eventBus = mitt<{
    selectionChanged: {
      localSelection: SelectionRange;
      serviceSelection: SelectionRange;
    };
  }>();
  get eventBus(): Pick<typeof this._eventBus, 'on' | 'off'> {
    return this._eventBus;
  }

  private selection = SelectionRange.ZERO;

  constructor(private readonly field: SimpleText) {
    this.field.eventBus.on('selectionChanged', (newSelection) => {
      this.selection = newSelection;
    });
  }

  insert(value: string) {
      this.field.insert(value, this.selection);
  }

  delete(count: number) {
    cy.then(() => {
      this.field.delete(count, this.selection);
  }

  select(start: number, end?: number) {
      const newSelection = SelectionRange.from(start, end);
      if (SelectionRange.isEqual(this.selection, newSelection)) {
        return;
      }

      this.selection = newSelection;
      this._eventBus.emit('selectionChanged', {
        localSelection: newSelection,
        serviceSelection: this.field.transformToServiceSelection(newSelection),
    });
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let user1: Pick<UserContext, 'userId' | 'editor'>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let user2: UserContext;
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

      user1 = {
        userId,
        editor: {
          [NoteTextFieldName.TITLE]: new CyElementField(titleField),
          [NoteTextFieldName.CONTENT]: new CyElementField(contentField),
        },
      };

      // Create note
    ({ noteId } = await createNote({
        graphQLService,
        userId,
    }));

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

                const testEditorByName = mapObject(fields, (key, value) => [
                  key,
                  new SimpleTextField(value),
                ]);

                let latestSelection = {
                  selection: SelectionRange.ZERO,
                  revision: collabService.headRevision,
                };
                Object.values(fields).forEach((field) => {
                  field.eventBus.on('selectionChanged', (selection) => {
                    latestSelection = {
                      selection: field.transformToServiceSelection(selection),
                      revision: collabService.headRevision,
                    };
                  });
                });
                Object.values(testEditorByName).forEach((testEditor) => {
                  testEditor.eventBus.on('selectionChanged', ({ serviceSelection }) => {
                    latestSelection = {
                      selection: serviceSelection,
                      revision: collabService.headRevision,
                    };
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
        submitChanges: async () => {
          await submitChanges({
                      collabService,
                      graphQLService,
                      noteId,
                    });
                  },
        submitSelection: async () => {
          await updateOpenNoteSelectionRange({
                        graphQLService,
                        noteId,
                        selectionRange: latestSelection.selection,
                        revision: latestSelection.revision,
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
  const contentValue = '[above]\n\n[below]\n';

  beforeEach(async () => {
    user2.editor.TITLE.insert('lorem ipsum title');
    user2.editor.CONTENT.insert(contentValue);
    await user2.submitChanges();
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
});
