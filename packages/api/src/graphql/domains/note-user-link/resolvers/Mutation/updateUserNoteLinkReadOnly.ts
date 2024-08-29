import { GraphQLError } from 'graphql';
import { GraphQLErrorCode, ResourceType } from '~api-app-shared/graphql/error-codes';
import { throwNoteNotFound } from '../../../../../services/graphql/errors';
import {
  findNoteUser,
  getNoteUsersIds,
  updateNoteReadOnly,
} from '../../../../../services/note/note';
import { objectIdToStr } from '../../../../../services/utils/objectid';
import { assertAuthenticated } from '../../../base/directives/auth';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { QueryableNote } from '../../../../../mongodb/descriptions/note';
import { MongoQueryFn } from '../../../../../mongodb/query/query';
import { isQueryOnlyId } from '../../../../../mongodb/query/utils/is-query-only-id';

export const updateUserNoteLinkReadOnly: NonNullable<
  MutationResolvers['updateUserNoteLinkReadOnly']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const readOnlyResult = await updateNoteReadOnly({
    mongoDB,
    noteId: input.noteId,
    readOnly: input.readOnly,
    scopeUserId: currentUserId,
    targetUserId: input.userId,
  });

  switch (readOnlyResult) {
    case 'note_not_found':
      throwNoteNotFound(input.noteId);
    // eslint-disable-next-line no-fallthrough
    case 'target_user_not_found':
      throw new GraphQLError(`Note user '${objectIdToStr(input.userId)}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
          resource: ResourceType.USER,
        },
      });
    case 'scope_user_not_older_than_target_user':
      throw new GraphQLError('Not authorized to change user readOnly field', {
        extensions: {
          code: GraphQLErrorCode.UNAUTHORIZED,
        },
      });
  }

  const noteQuery: MongoQueryFn<QueryableNote> = (query) =>
    mongoDB.loaders.note.load({
      id: {
        userId: currentUserId,
        noteId: input.noteId,
      },
      query,
    });

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateUserNoteLinkReadOnlyPayload',
    readOnly: input.readOnly,
    publicUserNoteLink: {
      noteId: input.noteId,
      query: async (query) => {
        const note = await noteQuery({
          users: {
            ...query,
            _id: 1,
          },
        });

        return findNoteUser(input.userId, note);
      },
    },
    note: {
      query: noteQuery,
    },
    user: {
      query: (query) => {
        if (isQueryOnlyId(query)) {
          return {
            _id: input.userId,
          };
        }

        return mongoDB.loaders.user.load({
          id: {
            userId: input.userId,
          },
          query,
        });
      },
    },
  };

  if (readOnlyResult !== 'already_read_only') {
    // Publish to everyone that can access the readOnly value
    const publishUsers = getNoteUsersIds(readOnlyResult.note);
    if (publishUsers) {
      await Promise.all(
        publishUsers.map((userId) => publishSignedInUserMutation(userId, payload, ctx))
      );
    }
  }

  return payload;
};
