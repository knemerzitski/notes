/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import mitt from 'mitt';
import { beforeEach, expect, it } from 'vitest';

import { CustomHeaderName } from '../../../../api-app-shared/src/custom-headers';
import { createDeferred } from '../../../../utils/src/deferred';

import { SignedInUserEventsInput } from '../../graphql/domains/types.generated';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { createDefaultApiOptions } from '../../parameters';
import { HttpSession } from '../helpers/e2e/http-session';
import { createGraphQLWebSocket } from '../helpers/e2e/websocket';
import { resetDatabase } from '../helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../helpers/mongodb/populate/note';
import { userAddNote } from '../helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../helpers/mongodb/populate/session';
import { fakeUserPopulateQueue } from '../helpers/mongodb/populate/user';

const USER_EVENTS_SUBSCRIPTION = `#graphql
  subscription UserEvents($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on OpenNoteUserSubscribedEvent {
          user {
            id
            noteLinkConnection {
              edges {
                node {
                  id
                  categoryName
                }
              }
            }
          }
        }
      }
    }

  }
`;

const NOTE_EVENTS_SUBSCRIPTION = `#graphql
  fragment MySelectionRange on UpdateOpenNoteSelectionRangePayload {
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

let opApi1: Awaited<ReturnType<typeof createGraphQLOperations>>;
let opApi2: Awaited<ReturnType<typeof createGraphQLOperations>>;
let userDb1: Awaited<ReturnType<typeof createDBdata>>;
let userDb2: Awaited<ReturnType<typeof createDBdata>>;

function createDBdata(note?: DBNoteSchema) {
  const user = fakeUserPopulateQueue();
  if (!note) {
    ({ note } = fakeNotePopulateQueue(user));
  }
  userAddNote(user, note);
  const session = fakeSessionPopulateQueue({
    override: {
      userId: user._id,
    },
  });
  return { user, note, session };
}

async function createHttpOperations(db: ReturnType<typeof createDBdata>) {
  const sessionsCookieKey = createDefaultApiOptions().sessions.cookieKey;

  const httpSession = new HttpSession();
  httpSession.setCookie(
    sessionsCookieKey,
    [objectIdToStr(db.session.userId), db.session.cookieId].join(':')
  );
  const ws = await createGraphQLWebSocket({
    headers: httpSession.getHeaders(),
  });
  httpSession.setHeader(CustomHeaderName.WS_CONNECTION_ID, ws.connectionId);

  return {
    ...db,
    fetch: httpSession.fetch.bind(httpSession),
    subscribe: ws.subscribe,
  };
}

function createGraphQLOperations(http: Awaited<ReturnType<typeof createHttpOperations>>) {
  function subscribeSignedInUserEvents() {
    const eventBus = mitt<{
      OpenNoteUserSubscribedEvent: Record<string, any>;
      UpdateOpenNoteSelectionRangePayload: Record<string, any>;
      error: Record<string, any>;
    }>();

    http.subscribe(
      {
        query: USER_EVENTS_SUBSCRIPTION,
        variables: {
          input: {
            authUser: {
              id: objectIdToStr(http.user._id) as any,
            },
          } satisfies SignedInUserEventsInput,
        },
      },
      (data) => {
        if (data.type === 'error') {
          eventBus.emit('error', data);
          return;
        }

        const firstError = data.payload.errors?.[0];
        if (firstError) {
          eventBus.emit('error', firstError);
          return;
        }

        for (const mutation of data.payload.data.signedInUserEvents.mutations) {
          eventBus.emit(mutation.__typename, mutation);
        }
      }
    );

    return eventBus;
  }

  function subscribeNoteEditorEvents() {
    const eventBus = mitt<{
      UpdateOpenNoteSelectionRangePayload: Record<string, any>;
      error: Record<string, any>;
    }>();

    http.subscribe(
      {
        query: NOTE_EVENTS_SUBSCRIPTION,
        variables: {
          input: {
            authUser: {
              id: objectIdToStr(http.user._id),
            },
            note: {
              id: objectIdToStr(http.note._id),
            },
          },
        },
      },
      (data) => {
        if (data.type === 'error') {
          eventBus.emit('error', data);
          return;
        }

        const firstError = data.payload.errors?.[0];
        if (firstError) {
          eventBus.emit('error', firstError);
          return;
        }

        for (const mutation of data.payload.data.openNoteEvents.mutations) {
          eventBus.emit(mutation.__typename, mutation);
        }
      }
    );

    return eventBus;
  }

  return {
    ...http,
    subscribeSignedInUserEvents,
    subscribeNoteEditorEvents,
  };
}

function createEditorApi(op: ReturnType<typeof createGraphQLOperations>) {
  const noteOpened = createDeferred<boolean>();

  const events: unknown[] = [];

  const signedInEvents = op.subscribeSignedInUserEvents();
  signedInEvents.on('OpenNoteUserSubscribedEvent', (payload) => {
    events.push({
      type: 'OpenNoteUserSubscribedEvent',
      payload,
    });

    if (payload.user.id === objectIdToStr(op.user._id)) {
      noteOpened.resolve(true);
    }
  });
  // signedInEvents.on('error', () => {
  //   noteOpened.reject();
  // });
  signedInEvents.on('*', ({ type, event: payload }) => {
    events.push({
      source: 'signedInEvents',
      type,
      payload,
    });
  });

  function openNote() {
    const eventBus = op.subscribeNoteEditorEvents();
    eventBus.on('*', ({ type, event: payload }) => {
      events.push({
        source: 'noteEditorEvents',
        type,
        payload,
      });
    });
  }

  return {
    events,
    openNote,
    noteOpened: noteOpened.promise,
  };
}

beforeEach(async () => {
  faker.seed(654654);
  await resetDatabase();

  userDb1 = createDBdata();
  userDb2 = createDBdata(userDb1.note);
  await populateExecuteAll();

  const httpContext1 = await createHttpOperations(userDb1);
  const httpContext2 = await createHttpOperations(userDb2);
  opApi1 = createGraphQLOperations(httpContext1);
  opApi2 = createGraphQLOperations(httpContext2);
});

it('throws error when accessing other user private fields', async () => {
  const user1 = createEditorApi(opApi1);
  const user2 = createEditorApi(opApi2);

  user1.openNote();
  await user1.noteOpened;

  await new Promise((res) => {
    setTimeout(res, 100);
  });

  expect(user2.events).toMatchInlineSnapshot(`
    [
      {
        "payload": {
          "locations": [
            {
              "column": 13,
              "line": 9,
            },
          ],
          "message": "User is not authenticated",
          "path": [
            "signedInUserEvents",
            "mutations",
            0,
            "user",
            "noteLinkConnection",
          ],
        },
        "source": "signedInEvents",
        "type": "error",
      },
    ]
  `);
});
