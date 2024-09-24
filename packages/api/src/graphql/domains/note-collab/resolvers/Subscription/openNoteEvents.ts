import { ObjectId } from 'mongodb';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { SubscriptionTopicPrefix } from '../../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';
import { GraphQLResolversContext } from '../../../../types';
import {
  publishSignedInUserMutation,
  publishSignedInUserMutations,
} from '../../../user/resolvers/Subscription/signedInUserEvents';
import { findNoteUser, getNoteUsersIds } from '../../../../../services/note/note';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import { PublisherOptions } from '~lambda-graphql/pubsub/publish';
import { withTransaction } from '../../../../../mongodb/utils/with-transaction';
import { NoteNotFoundServiceError } from '../../../../../services/note/errors';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { isDefined } from '~utils/type-guards/is-defined';

export function noteEditorTopic(noteId: ObjectId) {
  return `${SubscriptionTopicPrefix.NOTE_EDITOR_EVENTS}:${objectIdToStr(noteId)}`;
}

export const openNoteEvents: NonNullable<SubscriptionResolvers['openNoteEvents']> = {
  subscribe: (_parent, arg, ctx) => {
    const { auth, subscribe, mongoDB, connectionId } = ctx;

    const noteId = arg.noteId;

    if (!connectionId) {
      throw new Error('Expected connectionId in graphQL context to be defined');
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
            editing: {
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

    return subscribe(noteEditorTopic(noteId), {
      async onSubscribe() {
        assertAuthenticated(auth);
        const currentUserId = auth.session.userId;

        // Load will throw error if user has no access to note and subscription won't happen
        await loadNoteForSubscribe(currentUserId);
      },
      async onAfterSubscribe() {
        assertAuthenticated(auth);

        const currentUserId = auth.session.userId;

        const note = await loadNoteForSubscribe(currentUserId);

        const noteUser = findNoteUser(currentUserId, note);
        if (!noteUser) {
          // TODO move to service
          throw new NoteNotFoundServiceError(noteId);
        }

        const isCurrentUserAlreadyEditing = !!noteUser.editing;

        const userQuery = mongoDB.loaders.user.createQueryFn({
          userId: currentUserId,
        });
        const noteQuery = mongoDB.loaders.note.createQueryFn({
          noteId,
          userId: currentUserId,
        });

        const subscribedPayload: ResolversTypes['SignedInUserMutations'] = {
          __typename: 'OpenNoteUserSubscribedEvent',
          user: {
            query: userQuery,
          },
          note: {
            query: noteQuery,
          },
        };

        // TODO also send current user letting know that you're now editing??

        await Promise.all([
          // Only when editing first time
          ...(!isCurrentUserAlreadyEditing
            ? [
                // Remember that current user is editing
                mongoDB.collections.noteEditing.updateOne(
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
                      expireAt: new Date(
                        Date.now() +
                          (ctx.options?.note?.noteEditingDuration ?? 1000 * 60 * 60)
                      ),
                    },
                    $addToSet: {
                      connectionIds: connectionId,
                    },
                  },
                  {
                    upsert: true,
                  }
                ),
                // Let every other user know that current user is editing note
                ...getNoteUsersIds(note).map((userId) =>
                  publishSignedInUserMutation(userId, subscribedPayload, ctx)
                ),
              ]
            : []),
          // Send all other users editing state to current user
          publishSignedInUserMutations(
            currentUserId,
            [
              // Let user know that subscription has been processed
              subscribedPayload,
              ...note.users
                .map((noteUser) => {
                  if (!noteUser.editing?.collabText) return;
                  const editingCollabText = noteUser.editing.collabText;

                  return {
                    __typename: 'UpdateOpenNoteSelectionRangePayload' as const,
                    collabTextState: {
                      query: createValueQueryFn<
                        NonNullable<
                          NonNullable<QueryableNoteUser['editing']>['collabText']
                        >
                      >(() => editingCollabText),
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
      async onComplete() {
        assertAuthenticated(auth);

        const currentUserId = auth.session.userId;

        // Delete note editing for current connectionId
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
                      editing: {
                        connectionIds: 1,
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
              // TODO move to service
              throw new NoteNotFoundServiceError(noteId);
            }

            const editing = noteUser.editing;
            if (!editing) return;

            if (editing.connectionIds.length > 1) {
              // Have connectionIds in db and there is more than one
              if (editing.connectionIds.includes(connectionId)) {
                // Must only remove current connectionId, user is still editing through another client
                await runSingleOperation((session) =>
                  mongoDB.collections.noteEditing.updateOne(
                    {
                      noteId,
                      userId: currentUserId,
                    },
                    {
                      $pull: {
                        connectionIds: connectionId,
                      },
                    },
                    {
                      session,
                    }
                  )
                );
              }
            } else {
              // 1 or 0 connectionIds
              if (
                editing.connectionIds.length === 0 ||
                editing.connectionIds.includes(connectionId)
              ) {
                const unsubscribedPayload: ResolversTypes['SignedInUserMutations'] = {
                  __typename: 'OpenNoteUserUnsubscribedEvent',
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
                    mongoDB.collections.noteEditing.deleteOne(
                      {
                        noteId,
                        userId: currentUserId,
                      },
                      {
                        session,
                      }
                    )
                  ),
                  // Let every other user know that current user is no longer editing note
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
    noteEditorTopic(targetNoteId),
    {
      openNoteEvents: payload,
    },
    options
  );
}

export function publishOpenNoteMutations(
  targetNoteId: ObjectId,
  mutations: ResolversTypes['OpenNoteMutations'][],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishOpenNoteEvents(targetNoteId, { mutations }, ctx, options);
}

export function publishOpenNoteMutation(
  targetNoteId: ObjectId,
  mutation: ResolversTypes['OpenNoteMutations'],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishOpenNoteEvents(targetNoteId, { mutations: [mutation] }, ctx, options);
}
