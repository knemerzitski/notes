/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import mitt from 'mitt';
import { beforeEach, expect, it } from 'vitest';

import { CustomHeaderName } from '../../../../api-app-shared/src/custom-headers';
import { GraphQLErrorCode } from '../../../../api-app-shared/src/graphql/error-codes';
import { createDeferred } from '../../../../utils/src/deferred';

import {
  SignedInUserEventsInput,
  UpdateOpenNoteSelectionRangeInput,
  UpdateOpenNoteSelectionRangePayload,
} from '../../graphql/domains/types.generated';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { createDefaultApiOptions } from '../../parameters';
import { fetchGraphQL } from '../helpers/e2e/fetch-graphql';
import { HttpSession } from '../helpers/e2e/http-session';
import { createGraphQLWebSocket } from '../helpers/e2e/websocket';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../helpers/graphql/response';
import { resetDatabase } from '../helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../helpers/mongodb/populate/note';
import { userAddNote } from '../helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../helpers/mongodb/populate/session';
import { fakeUserPopulateQueue } from '../helpers/mongodb/populate/user';

const USER_EVENTS_SUBSCRIPTION = `#graphql
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

  subscription UserEvents($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on OpenNoteUserSubscribedEvent {
          user {
            id
          }
        }
        ... on UpdateOpenNoteSelectionRangePayload {
          ...MySelectionRange
        }
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

const UPDATE_EDITOR = `#graphql
  mutation UpdateNoteEditorSelectionRange($input: UpdateOpenNoteSelectionRangeInput!) {
    updateOpenNoteSelectionRange(input: $input) {
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
  }
`;

let opApi1: Awaited<ReturnType<typeof createGraphQLOperations>>;
let opApi2: Awaited<ReturnType<typeof createGraphQLOperations>>;

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
          console.error(data);
          throw new Error('Subscribe received error');
        }

        const firstError = data.payload.errors?.[0];
        expect(firstError).toBeUndefined();

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
          console.error(data);
          throw new Error('Subscribe received error');
        }

        const firstError = data.payload.errors?.[0];
        expect(firstError).toBeUndefined();

        for (const mutation of data.payload.data.openNoteEvents.mutations) {
          eventBus.emit(mutation.__typename, mutation);
        }
      }
    );

    return eventBus;
  }

  async function updateNoteEditorSelectionRange(
    input: Omit<UpdateOpenNoteSelectionRangeInput, 'note' | 'authUser'>
  ) {
    return fetchGraphQL<{
      updateNoteEditorSelectionRange: UpdateOpenNoteSelectionRangePayload;
    }>(
      {
        query: UPDATE_EDITOR,
        variables: {
          input: {
            ...input,
            authUser: {
              id: objectIdToStr(http.user._id) as any,
            },
            note: {
              id: objectIdToStr(http.note._id) as any,
            },
          } satisfies UpdateOpenNoteSelectionRangeInput,
        },
      },
      {
        fetchFn: http.fetch,
      }
    );
  }

  return {
    ...http,
    subscribeSignedInUserEvents,
    subscribeNoteEditorEvents,
    updateNoteEditorSelectionRange,
  };
}

function createEditorApi(op: ReturnType<typeof createGraphQLOperations>) {
  type Event =
    | { type: 'subscribed'; userId: string }
    | { type: 'initial_selection_updated'; start: number }
    | { type: 'selection_updated'; start: number };

  const noteOpened = createDeferred<boolean>();

  const events: Event[] = [];

  const signedInEvents = op.subscribeSignedInUserEvents();
  signedInEvents.on('OpenNoteUserSubscribedEvent', (payload) => {
    events.push({
      type: 'subscribed',
      userId: payload.user.id,
    });

    if (payload.user.id === objectIdToStr(op.user._id)) {
      noteOpened.resolve(true);
    }
  });
  signedInEvents.on('UpdateOpenNoteSelectionRangePayload', (payload) => {
    events.push({
      type: 'initial_selection_updated',
      start: payload.collabTextEditing.latestSelection.start,
    });
  });
  signedInEvents.on('error', () => {
    noteOpened.reject();
  });

  async function setSelectionStart(
    start: number,
    expectedError?: string | RegExp | GraphQLErrorCode
  ) {
    const { graphQLResponse } = await op.updateNoteEditorSelectionRange({
      revision: 1,
      selectionRange: {
        start,
      },
    });

    if (expectedError) {
      expectGraphQLResponseError(graphQLResponse, expectedError);
      return;
    } else {
      return expectGraphQLResponseData(graphQLResponse);
    }
  }

  function openNote() {
    const noteEvents = op.subscribeNoteEditorEvents();
    noteEvents.on('UpdateOpenNoteSelectionRangePayload', (payload) => {
      events.push({
        type: 'selection_updated',
        start: payload.collabTextEditing.latestSelection.start,
      });
    });
  }

  return {
    events,
    openNote,
    noteOpened: noteOpened.promise,
    setSelectionStart,
  };
}

beforeEach(async () => {
  faker.seed(654654);
  await resetDatabase();

  const userDb1 = createDBdata();
  const userDb2 = createDBdata(userDb1.note);
  await populateExecuteAll();

  const httpContext1 = await createHttpOperations(userDb1);
  const httpContext2 = await createHttpOperations(userDb2);
  opApi1 = createGraphQLOperations(httpContext1);
  opApi2 = createGraphQLOperations(httpContext2);
});

it('subscribes to noteEditorEvents and receives initial selection and updates', async () => {
  const user1 = createEditorApi(opApi1);
  const user2 = createEditorApi(opApi2);

  user1.openNote();
  await user1.noteOpened;

  await user1.setSelectionStart(1);

  user2.openNote();
  await user2.noteOpened;
  await user2.setSelectionStart(2);

  await user1.setSelectionStart(3);
  await user2.setSelectionStart(4);

  expect(user1.events).toStrictEqual([
    // user 1 subscribed
    { type: 'subscribed', userId: objectIdToStr(opApi1.user._id) }, // self
    // user 2 subscribed
    { type: 'subscribed', userId: objectIdToStr(opApi2.user._id) }, // global
    // selection change
    { type: 'selection_updated', start: 2 },
    // selection change
    { type: 'selection_updated', start: 4 },
  ]);
  expect(user2.events).toStrictEqual([
    // user 1 subscribed
    { type: 'subscribed', userId: objectIdToStr(opApi1.user._id) }, // global
    // user 2 subscribed, state of all connected users
    { type: 'subscribed', userId: objectIdToStr(opApi2.user._id) }, // self
    { type: 'subscribed', userId: objectIdToStr(opApi1.user._id) }, // other
    { type: 'initial_selection_updated', start: 1 }, // other
    // selection change
    { type: 'selection_updated', start: 3 },
  ]);
});

it('throws error if attempting to update selection when not subscribed to noteEditorEvents', async () => {
  const user = createEditorApi(opApi1);
  await user.setSelectionStart(1, /note has not been opened/i);
});
