import { GraphQLError } from 'graphql';
import { GraphQLErrorCode, ResourceType } from '~api-app-shared/graphql/error-codes';
import {
  NoteNotFoundServiceError,
  NoteUserNotFoundServiceError,
} from '../../services/note/errors';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { ObjectId } from 'mongodb';
import { NoteNotFoundQueryLoaderError } from '../../mongodb/loaders/note/loader';

class NoteNotFoundError extends GraphQLError {
  constructor(noteId: ObjectId) {
    super(`Note '${objectIdToStr(noteId)}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
        resource: ResourceType.NOTE,
      },
    });
  }
}

export function formatError(error: unknown) {
  if (
    error instanceof NoteNotFoundServiceError ||
    error instanceof NoteUserNotFoundServiceError
  ) {
    return new NoteNotFoundError(error.noteId);
  } else if (error instanceof NoteNotFoundQueryLoaderError) {
    return new NoteNotFoundError(error.key.id.noteId);
  }

  return;
}
