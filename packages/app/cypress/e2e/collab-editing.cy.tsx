/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SignInInput,
  OpenNoteEventsInput,
  UpdateNoteInsertRecordInput,
  CollabTextRecordInput,
} from '../../src/__generated__/graphql';

const SIGN_IN = `#graphql
  mutation SignIn($input: SignInInput!){
    signIn(input: $input) {
      __typename
      ... on SignInResult {
        signedInUser {
          id
        }
      }
    }
  }
`;

const INSERT_RECORD = `#graphql
  mutation InsertRecord($input: UpdateNoteInsertRecordInput!) {
    updateNoteInsertRecord(input: $input) {
      note {
        id
      }
    }
  }
`;

const NOTE_EVENTS_SUBSCRIPTION = `#graphql
  fragment MySelectionRange on UpdateOpenNoteSelectionRangePayload {
    collabTextEditing {
      revision
      latestSelection {
        start
        end
      }
    }
    note {
      id
    }
  }

  subscription NoteEvents($input: OpenNoteEventsInput!) {
    openNoteEvents(input: $input) {
      mutations {
        __typename
        ... on UpdateOpenNoteSelectionRangePayload {
          ...MySelectionRange
        }
      }
    }
  }
`;

function requestSignIn(options: { userId: string }) {
  return cy
    .request({
      url: Cypress.env('API_URL'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'SignIn',
        variables: {
          input: {
            auth: {
              google: {
                token: `{"id":"${options.userId}","name":"User 1","email":"test@test"}`,
              },
            },
          } satisfies SignInInput,
        },
        query: SIGN_IN,
      }),
    })
    .then((res) => {
      const userId = res.body.data.signIn.signedInUser.id as string;
      const sessionId = res.headers['set-cookie']?.[0]?.match(/:(.+?);/)?.[1]!;

      return {
        userId,
        sessionId,
        headers: {
          Cookies: `Sessions=${userId}:${sessionId}`,
        },
      };
    });
}

function requestInsertRecord(options: {
  userId: string;
  noteId: string;
  record: CollabTextRecordInput;
}) {
  return cy.request({
    url: Cypress.env('API_URL'),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'InsertRecord',
      variables: {
        input: {
          authUser: {
            id: options.userId,
          },
          note: {
            id: options.noteId,
          },
          insertRecord: options.record,
        } satisfies UpdateNoteInsertRecordInput,
      },
      query: INSERT_RECORD,
    }),
  });
}

beforeEach(() => {
  cy.resetDatabase();
});

it('sign in, create note, share link and collab edit with another user', () => {
  cy.visit('/');

  // Sign in with user 1
  cy.get('[aria-label="open accounts"]').click();
  cy.contains('Sign in with Google').click();
  cy.get('[name="id"]').type('1');
  cy.get('[name="name"]').type('1 User');
  cy.contains('Sign In').click();

  cy.get('[aria-label="open accounts"]').should('contain.text', '1');

  // Create a new note and type in it
  cy.get('[placeholder="Take a note..."]').click();
  cy.get('[placeholder="Title"]').click();
  cy.focused().type('foo title');
  cy.get('[placeholder="Note"]').click();
  cy.focused().type('foo content');
  cy.contains('Close').click();

  // Get note id
  cy.get('[data-is-local="false"]');
  cy.get('[data-note-id]')
    .invoke('attr', 'data-note-id')
    .then((noteId) => {
      if (typeof noteId !== 'string') {
        return;
      }
      // Open note dialog and generate share note link
      cy.get('[aria-label="open note dialog"]').click();

      cy.get('[role=dialog] [aria-label="Collaboration"]').click();

      cy.get('[aria-label="create share link"]').click();
      cy.get('[data-has-link="true"] input')
        .invoke('val')
        .then((shareNoteUrl) => {
          if (typeof shareNoteUrl !== 'string') {
            return;
          }

          cy.get('[aria-label="close sharing dialog"]').click();
          cy.contains('Close').click();

          // Sign out
          cy.get('[aria-label="open accounts"]').click();
          cy.contains('Sign out all accounts').click();

          // Sign in with user 2
          cy.get('[aria-label="open accounts"]').click();
          cy.contains('Sign in with Google').click();
          cy.get('[name="id"]').type('2');
          cy.get('[name="name"]').type('2 User');
          cy.contains('Sign In').click();

          cy.get('[aria-label="open accounts"]').should('contain.text', '2');

          // Access note via share url using user 2
          cy.visit(shareNoteUrl);
          cy.get(`[id="note-edit-dialog-${noteId}"]`).should('be.visible');

          // Programatically sign in with user 1 and open the note
          requestSignIn({
            userId: '1',
          }).then(({ userId, headers }) => {
            cy.wsConnect({
              headers,
            }).then((ws) => {
              // Subscribe to note events so that caret will be visible
              ws.subscribe({
                subscription: {
                  query: NOTE_EVENTS_SUBSCRIPTION,
                  variables: {
                    input: {
                      authUser: {
                        id: userId,
                      },
                      note: {
                        id: noteId,
                      },
                    } satisfies OpenNoteEventsInput,
                  },
                },
              });
            });

            cy.get('[placeholder="Title"]').should('have.value', 'foo title');
            cy.get('[placeholder="Note"]').should('have.value', 'foo content');

            // Revision might be different depending on how fast text is typed
            cy.getNoteCollabTextRevision({
              noteId,
            }).then(({ revision }) => {
              requestInsertRecord({
                userId,
                noteId,
                record: {
                  change: {
                    revision,
                    // {"CONTENT":"foo content","TITLE":"foo title"}
                    changeset: [[0, 14], ' BOO', [15, 44]] as any,
                  },
                  afterSelection: {
                    start: 19,
                    end: 19,
                  },
                  beforeSelection: {
                    start: 15,
                    end: 15,
                  },
                  generatedId: 'aa',
                },
              });
            });
          });
        });
    });

  cy.get('[placeholder="Title"]').should('have.value', 'foo title');
  cy.get('[placeholder="Note"]').should('have.value', 'foo BOO content');
  // User 1 has selection after inserted " BOO"
  cy.get('[aria-label="caret-1 User"]').should('have.data', 'selection', 7);

  // User 2 selection stays after " BOO"
  cy.get('[placeholder="Note"]').click();
  cy.focused().type('{moveToStart}START:');
  cy.get('[placeholder="Note"]').should('have.value', 'START:foo BOO content');
});
