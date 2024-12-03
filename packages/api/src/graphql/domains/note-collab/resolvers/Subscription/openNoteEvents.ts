import { ObjectId } from 'mongodb';

import { PublisherOptions } from '~lambda-graphql/pubsub/publish';

import { isDefined } from '~utils/type-guards/is-defined';

import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { withTransaction } from '../../../../../mongodb/utils/with-transaction';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { NoteNotFoundServiceError } from '../../../../../services/note/errors';
import { findNoteUser, getNoteUsersIds } from '../../../../../services/note/note';
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
      async onAfterSubscribe() {
        assertAuthenticated(auth);

        const currentUserId = auth.session.userId;

        const note = await loadNoteForSubscribe(currentUserId);

        const noteUser = findNoteUser(currentUserId, note);
        if (!noteUser) {
          throw new NoteNotFoundServiceError(noteId);
        }

        const hasCurrentUserAlreadyOpenedNote = !!noteUser.openNote;

        const userQuery = mongoDB.loaders.user.createQueryFn({
          userId: currentUserId,
        });
        const noteQuery = mongoDB.loaders.note.createQueryFn({
          noteId,
          userId: currentUserId,
        });

        const subscribedPayload: ResolversTypes['SignedInUserMutation'] = {
          __typename: 'OpenNoteUserSubscribedEvent',
          user: {
            query: userQuery,
          },
          note: {
            query: noteQuery,
          },
        };

        await Promise.all([
          // Only when opening note the first time
          ...(!hasCurrentUserAlreadyOpenedNote
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
                      expireAt: new Date(
                        Date.now() +
                          (ctx.options?.note?.openNoteDuration ?? 1000 * 60 * 60)
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
                  const openCollabText = noteUser.openNote.collabText;

                  return {
                    __typename: 'UpdateOpenNoteSelectionRangePayload' as const,
                    collabTextState: {
                      query: createValueQueryFn<
                        NonNullable<
                          NonNullable<QueryableNoteUser['openNote']>['collabText']
                        >
                      >(() => openCollabText),
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
              throw new NoteNotFoundServiceError(noteId);
            }

            const openNote = noteUser.openNote;
            if (!openNote) return;

            if (openNote.connectionIds.length > 1) {
              // Have connectionIds in db and there is more than one
              if (openNote.connectionIds.includes(connectionId)) {
                // Must only remove current connectionId, user still has note open through another connection
                await runSingleOperation((session) =>
                  mongoDB.collections.openNotes.updateOne(
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
                openNote.connectionIds.length === 0 ||
                openNote.connectionIds.includes(connectionId)
              ) {
                const unsubscribedPayload: ResolversTypes['SignedInUserMutation'] = {
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
