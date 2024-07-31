import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import { DeepQueryResult } from '../../../../mongodb/query/query';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserNoteSchema } from '../../../../mongodb/schema/note/user-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteCreated } from '../../../note/resolvers/Subscription/noteCreated';

import {
  NoteCategory,
  type MutationResolvers,
  type ResolversTypes,
} from './../../../types.generated';

export const linkSharedNote: NonNullable<MutationResolvers['linkSharedNote']> = async (
  _parent,
  { input: { shareId: shareNoteLinkPublicId } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  // TODO check if user is allowed to access this note

  const currentUserId = auth.session.user._id;

  // TODO use loader
  const note = (await mongodb.collections.notes.findOne(
    {
      'shareNoteLinks.publicId': shareNoteLinkPublicId,
    },
    {
      projection: {
        _id: 1,
        publicId: 1,
        userNotes: {
          userId: 1,
        },
      },
    }
  )) as
    | DeepQueryResult<
        Pick<NoteSchema, '_id' | 'publicId' | 'shareNoteLinks'> & {
          userNotes: Pick<
            NoteSchema['userNotes'] extends (infer U)[] ? U : never,
            'userId'
          >[];
        }
      >
    | null
    | undefined;

  if (!note) {
    throw new GraphQLError(`Shared note '${shareNoteLinkPublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const notePublicId = note.publicId;
  if (!notePublicId) {
    throw new ErrorWithData(`Expected Note.publicId to be defined`, {
      userId: currentUserId,
      shareNoteLinkPublicId,
      note,
    });
  }
  if (!note.userNotes) {
    throw new ErrorWithData(`Expected Note.userNotes to be defined`, {
      userId: currentUserId,
      shareNoteLinkPublicId,
      note,
    });
  }

  // TODO implement permissions and expiration

  const userIsAlreadyLinked = note.userNotes.some(
    (userNote) => userNote.userId?.equals(currentUserId)
  );
  // Return early since UserNote already exists
  if (userIsAlreadyLinked) {
    const publicId = note.publicId;
    return {
      note: new NoteQueryMapper(currentUserId, {
        query(query) {
          return mongodb.loaders.note.load({
            userId: currentUserId,
            publicId,
            noteQuery: query,
          });
        },
      }),
    };
  }

  if (!note._id) {
    throw new ErrorWithData(`Expected Note._id to be defined`, {
      userId: currentUserId,
      shareNoteLinkPublicId,
      note,
    });
  }

  const sharedUserNote: UserNoteSchema = {
    userId: currentUserId,
  };

  await mongodb.client.withSession((session) =>
    session.withTransaction((session) => {
      return Promise.all([
        mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          {
            $push: {
              [getNotesArrayPath(NoteCategory.DEFAULT)]: note._id,
            },
          },
          { session }
        ),
        mongodb.collections.notes.updateOne(
          {
            _id: note._id,
          },
          {
            $push: {
              userNotes: sharedUserNote,
            },
          },
          { session }
        ),
      ]);
    })
  );

  const noteQueryMapper = new NoteQueryMapper(currentUserId, {
    query(query) {
      return mongodb.loaders.note.load({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: query,
      });
    },
  });

  const payload: ResolversTypes['CreateNotePayload'] &
    ResolversTypes['NoteCreatedPayload'] = {
    note: noteQueryMapper,
  };

  await publishNoteCreated(ctx, payload);

  return payload;
};
