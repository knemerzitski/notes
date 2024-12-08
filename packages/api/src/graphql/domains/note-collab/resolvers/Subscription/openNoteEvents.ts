import { ObjectId } from 'mongodb';

import { PublisherOptions } from '~lambda-graphql/pubsub/publish';

import { isDefined } from '~utils/type-guards/is-defined';

import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn, createValueQueryFn } from '../../../../../mongodb/query/query';
import { OpenNoteSchema } from '../../../../../mongodb/schema/open-note';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { withTransaction } from '../../../../../mongodb/utils/with-transaction';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { NoteNotFoundServiceError } from '../../../../../services/note/errors';
import {
  findNoteUser,
  findNoteUserMaybe,
  getNoteUsersIds,
} from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import { SubscriptionTopicPrefix } from '../../../../subscriptions';
import { GraphQLResolversContext } from '../../../../types';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';
import {
  publishSignedInUserMutation,
  publishSignedInUserMutations,
} from '../../../user/resolvers/Subscription/signedInUserEvents';

export function openNoteTopic(noteId: ObjectId) {
  return `${SubscriptionTopicPrefix.OPEN_NOTE_EVENTS}:${objectIdToStr(noteId)}`;
}

export const openNoteEvents: NonNullable<SubscriptionResolvers['openNoteEvents']> = {
  subscribe: (_parent, arg, ctx) => {
    const { auth, subscribe, mongoDB, connectionId } = ctx;

    const noteId = arg.noteId;

    if (!connectionId) {
      throw new Error('connectionId is not defined in subscribe GraphQL context');
    }

    function loadNoteForSubscribe(userId: ObjectId) {
      return mongoDB.loaders.note.load({
        id: {
          userId,
          noteId,
        },
        query: {
          _id: 1,
          users: {
            _id: 1,
            openNote: {
              clients: {
                connectionId: 1,
                subscriptionId: 1,
              },
              collabText: {
                revision: 1,
                latestSelection: {
                  start: 1,
                  end: 1,
                },
              },
            },
          },
        },
      });
    }

    return subscribe(openNoteTopic(noteId), {
      async onSubscribe() {
        assertAuthenticated(auth);
        const currentUserId = auth.session.userId;

        // Load will throw error if user has no access to note and subscription won't happen
        await loadNoteForSubscribe(currentUserId);
      },
      async onAfterSubscribe(subscriptionId) {
        assertAuthenticated(auth);

        const currentUserId = auth.session.userId;

        const note = await loadNoteForSubscribe(currentUserId);

        const noteUser = findNoteUser(currentUserId, note);
        if (!noteUser) {
          throw new NoteNotFoundServiceError(noteId);
        }

        const hasCurrentConnectionAlreadyOpenedNote = !!noteUser.openNote?.clients.some(
          (client) => client.connectionId === connectionId
        );

        const userQuery = mongoDB.loaders.user.createQueryFn({
          userId: currentUserId,
        });
        const noteQuery = mongoDB.loaders.note.createQueryFn({
          noteId,
          userId: currentUserId,
        });

        const userNoteQuery = createMapQueryFn(noteQuery)<QueryableNoteUser>()(
          (query) => {
            return {
              users: {
                ...query,
                _id: 1,
              },
            };
          },
          (note) => {
            return findNoteUserMaybe(currentUserId, note);
          }
        );

        const subscribedPayload: ResolversTypes['SignedInUserMutation'] = {
          __typename: 'OpenNoteUserSubscribedEvent',
          publicUserNoteLink: {
            noteId,
            query: userNoteQuery,
          },
          user: {
            query: userQuery,
          },
          note: {
            query: noteQuery,
          },
        };

        const openNote: Omit<OpenNoteSchema, 'clients'> = {
          noteId,
          userId: currentUserId,
          expireAt: new Date(
            Date.now() + (ctx.options?.note?.openNoteDuration ?? 1000 * 60 * 60)
          ),
        };

        // Prime with new expireAt
        mongoDB.loaders.note.prime(
          {
            id: {
              noteId,
              userId: currentUserId,
            },
            query: {
              _id: 1,
              users: {
                openNote: {
                  expireAt: 1,
                },
              },
            },
          },
          {
            _id: note._id,
            users: note.users.map((_noteUser) =>
              _noteUser._id.equals(noteUser._id)
                ? {
                    ..._noteUser,
                    openNote,
                  }
                : _noteUser
            ),
          }
        );

        await Promise.all([
          // Only when opening note the first time
          ...(!hasCurrentConnectionAlreadyOpenedNote
            ? [
                // Remember that current user has opened the note
                mongoDB.collections.openNotes.updateOne(
                  {
                    noteId,
                    userId: currentUserId,
                  },
                  {
                    $setOnInsert: {
                      noteId: noteId,
                      userId: currentUserId,
                    },
                    $set: {
                      expireAt: openNote.expireAt,
                    },
                    $addToSet: {
                      clients: {
                        connectionId,
                        subscriptionId,
                      },
                    },
                  },
                  {
                    upsert: true,
                  }
                ),
                // Let every other user know that current user has opened the note
                ...getNoteUsersIds(note).map((userId) =>
                  publishSignedInUserMutation(userId, subscribedPayload, ctx)
                ),
              ]
            : []),
          // Send all other users open note state to current user
          publishSignedInUserMutations(
            currentUserId,
            [
              // Let user know that subscription has been processed
              subscribedPayload,
              ...note.users
                .map((noteUser) => {
                  if (!noteUser.openNote?.collabText) return;
                  const openNote = noteUser.openNote;

                  return {
                    __typename: 'UpdateOpenNoteSelectionRangePayload' as const,
                    collabTextEditing: {
                      query: createValueQueryFn<
                        NonNullable<
                          NonNullable<QueryableNoteUser['openNote']>['collabText']
                        >
                      >(() => openNote.collabText),
                    },
                    openedNote: {
                      query: createValueQueryFn<
                        NonNullable<NonNullable<QueryableNoteUser['openNote']>>
                      >(() => openNote),
                    },
                    publicUserNoteLink: {
                      noteId,
                      query: userNoteQuery,
                    },
                    collabText: {
                      id: CollabText_id_fromNoteQueryFn(noteQuery),
                      query: mapNoteToCollabTextQueryFn(noteQuery),
                    },
                    user: {
                      query: mongoDB.loaders.user.createQueryFn({
                        userId: noteUser._id,
                      }),
                    },
                    note: {
                      query: noteQuery,
                    },
                  };
                })
                .filter(isDefined),
            ],
            ctx,
            {
              publishToCurrentConnection: true,
            }
          ),
        ]);
      },
      async onComplete(subscriptionId) {
        assertAuthenticated(auth);

        const currentUserId = auth.session.userId;

        // Delete openNote for current connectionId
        await withTransaction(
          mongoDB.client,
          async ({ runSingleOperation }) => {
            const note = await runSingleOperation((session) =>
              mongoDB.loaders.note.load(
                {
                  id: {
                    userId: currentUserId,
                    noteId,
                  },
                  query: {
                    _id: 1,
                    users: {
                      _id: 1,
                      openNote: {
                        clients: {
                          connectionId: 1,
                          subscriptionId: 1,
                        },
                      },
                    },
                  },
                },
                {
                  session,
                }
              )
            );

            const noteUser = findNoteUser(currentUserId, note);
            if (!noteUser) {
              throw new NoteNotFoundServiceError(noteId);
            }

            const openNote = noteUser.openNote;
            if (!openNote) return;

            if (openNote.clients.length > 1) {
              // Have connections in db and there is more than one
              if (
                openNote.clients.some(
                  (client) =>
                    client.connectionId === connectionId &&
                    client.subscriptionId === subscriptionId
                )
              ) {
                // Must only remove current connectionId, user still has note open through another connection
                await runSingleOperation((session) =>
                  mongoDB.collections.openNotes.updateOne(
                    {
                      noteId,
                      userId: currentUserId,
                    },
                    {
                      $pull: {
                        clients: {
                          connectionId,
                          subscriptionId,
                        },
                      },
                    },
                    {
                      session,
                    }
                  )
                );
              }
            } else {
              // 1 or 0 connections
              if (
                openNote.clients.length === 0 ||
                openNote.clients.some(
                  (client) =>
                    client.connectionId === connectionId &&
                    client.subscriptionId === subscriptionId
                )
              ) {
                const noteQuery = mongoDB.loaders.note.createQueryFn({
                  noteId,
                  userId: currentUserId,
                });

                const userNoteQuery = createMapQueryFn(noteQuery)<QueryableNoteUser>()(
                  (query) => ({
                    users: {
                      ...query,
                      _id: 1,
                    },
                  }),
                  (note) => findNoteUserMaybe(currentUserId, note)
                );

                const unsubscribedPayload: ResolversTypes['SignedInUserMutation'] = {
                  __typename: 'OpenNoteUserUnsubscribedEvent',
                  publicUserNoteLink: {
                    noteId,
                    query: userNoteQuery,
                  },
                  user: {
                    query: mongoDB.loaders.user.createQueryFn({
                      userId: currentUserId,
                    }),
                  },
                  note: {
                    query: mongoDB.loaders.note.createQueryFn({
                      noteId,
                      userId: currentUserId,
                    }),
                  },
                };

                const allNoteUsers = getNoteUsersIds(note);

                await Promise.all([
                  // Either no connectionids or only current connectionId, can delete document
                  runSingleOperation((session) =>
                    mongoDB.collections.openNotes.deleteOne(
                      {
                        noteId,
                        userId: currentUserId,
                      },
                      {
                        session,
                      }
                    )
                  ),
                  // Let every other user know that current user has closed the note
                  ...allNoteUsers.map((userId) =>
                    publishSignedInUserMutation(userId, unsubscribedPayload, ctx)
                  ),
                ]);
              }
            }
          },
          { skipAwaitFirstOperation: true }
        );
      },
    });
  },
};

export async function publishOpenNoteEvents(
  targetNoteId: ObjectId,
  payload: ResolversTypes['OpenNoteEventsPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return await publish(
    openNoteTopic(targetNoteId),
    {
      openNoteEvents: payload,
    },
    options
  );
}

export function publishOpenNoteMutations(
  targetNoteId: ObjectId,
  mutations: ResolversTypes['OpenNoteMutation'][],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishOpenNoteEvents(targetNoteId, { mutations }, ctx, options);
}

export function publishOpenNoteMutation(
  targetNoteId: ObjectId,
  mutation: ResolversTypes['OpenNoteMutation'],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishOpenNoteEvents(targetNoteId, { mutations: [mutation] }, ctx, options);
}
