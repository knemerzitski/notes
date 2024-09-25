/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { beforeEach, expect, it } from 'vitest';
import { resetDatabase } from '../helpers/mongodb/mongodb';
import { fakeUserPopulateQueue } from '../helpers/mongodb/populate/user';
import { populateExecuteAll } from '../helpers/mongodb/populate/populate-queue';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { fakeNotePopulateQueue } from '../helpers/mongodb/populate/note';
import { fakeSessionPopulateQueue } from '../helpers/mongodb/populate/session';
import { HttpSession } from '../helpers/e2e/http-session';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { createGraphQLWebSocket } from '../helpers/e2e/websocket';
import { Cookies } from '../../services/http/cookies';
import { userAddNote } from '../helpers/mongodb/populate/populate';
import { fetchGraphQL } from '../helpers/e2e/fetch-graphql';
import { mitt } from '~utils/mitt-unsub';
import { createDeferred } from '~utils/deferred';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../helpers/graphql/response';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import {
  UpdateOpenNoteSelectionRangeInput,
  UpdateOpenNoteSelectionRangePayload,
} from '../../graphql/domains/types.generated';

const USER_EVENTS_SUBSCRIPTION = `#graphql
  fragment MySelectionRange on UpdateOpenNoteSelectionRangePayload {
    collabTextState {
      revision
      latestSelection {
        start
        end
      }
    }
    note {
      id
    }
    user {
      id
      profile {
        displayName
      }
    }
  }

  subscription UserEvents {
    signedInUserEvents {
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
    collabTextState {
      revision
      latestSelection {
        start
        end
      }
    }
    note {
      id
    }
    user {
      id
      profile {
        displayName
      }
    }
  }

  subscription NoteEvents($noteId: ObjectID!) {
    openNoteEvents(noteId: $noteId) {
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
      collabTextState {
        revision
        latestSelection {
          start
          end
        }
      }
      note {
        id
      }
      user {
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
    note = fakeNotePopulateQueue(user);
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
  const httpSession = new HttpSession();
  httpSession.setHeader(CustomHeaderName.USER_ID, objectIdToStr(db.session.userId));
  httpSession.setCookie(
    Cookies.SESSIONS_KEY,
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
      },
      (data) => {
        if (data.type === 'error') {
          eventBus.emit('error', data);
          console.error(data);
          throw new Error('Subscribe received error');
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
          noteId: objectIdToStr(http.note._id),
        },
      },
      (data) => {
        if (data.type === 'error') {
          eventBus.emit('error', data);
          console.error(data);
          throw new Error('Subscribe received error');
        }
        for (const mutation of data.payload.data.openNoteEvents.mutations) {
          eventBus.emit(mutation.__typename, mutation);
        }
      }
    );

    return eventBus;
  }

  async function updateNoteEditorSelectionRange(
    input: Omit<UpdateOpenNoteSelectionRangeInput, 'noteId'>
  ) {
    return fetchGraphQL<{
      updateNoteEditorSelectionRange: UpdateOpenNoteSelectionRangePayload;
    }>(
      {
        query: UPDATE_EDITOR,
        variables: {
          input: {
            ...input,
            noteId: objectIdToStr(http.note._id) as any,
          },
        },
      },
      http.fetch
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
      start: payload.collabTextState.latestSelection.start,
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
        start: payload.collabTextState.latestSelection.start,
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
    { type: 'subscribed', userId: objectIdToStr(opApi1.user._id) },
    { type: 'subscribed', userId: objectIdToStr(opApi2.user._id) },
    { type: 'selection_updated', start: 2 },
    { type: 'selection_updated', start: 4 },
  ]);
  expect(user2.events).toStrictEqual([
    { type: 'subscribed', userId: objectIdToStr(opApi1.user._id) },
    { type: 'subscribed', userId: objectIdToStr(opApi2.user._id) },
    { type: 'initial_selection_updated', start: 1 },
    { type: 'selection_updated', start: 3 },
  ]);
});

it('throws error if attempting to update selection when not subscribed to noteEditorEvents', async () => {
  const user = createEditorApi(opApi1);
  await user.setSelectionStart(1, /not opened the note/);
});
