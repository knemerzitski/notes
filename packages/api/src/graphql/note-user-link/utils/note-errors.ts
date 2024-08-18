import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode, ResourceType } from '~api-app-shared/graphql/error-codes';

import { objectIdToStr } from '../../base/resolvers/ObjectID';

/**
 * Throws note not found GraphQLError with code GraphQLErrorCode.NOT_FOUND
 */
export function throwNoteNotFound(noteId: ObjectId): never {
  throw new GraphQLError(`Note '${objectIdToStr(noteId)}' not found`, {
    extensions: {
      code: GraphQLErrorCode.NOT_FOUND,
      resource: ResourceType.NOTE,
    },
  });
}

export function throwNoteIsReadOnly(noteId: ObjectId): never {
  throw new GraphQLError(
    `Note '${objectIdToStr(noteId)}' is read-only and cannot be modified.`,
    {
      extensions: {
        code: GraphQLErrorCode.READ_ONLY,
      },
    }
  );
}
