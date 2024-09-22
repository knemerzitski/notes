import { GraphQLError } from 'graphql';
import {
  GraphQLErrorCode,
  InputType,
  ResourceType,
} from '~api-app-shared/graphql/error-codes';
import {
  NoteCollabRecordInsertError,
  NoteNotFoundServiceError,
  NoteReadOnlyServiceError,
  NoteUserNotFoundServiceError,
} from '../../services/note/errors';
import { NoteNotFoundQueryLoaderError } from '../../mongodb/loaders/note/loader';
import { ErrorMapper } from './utils/error-mapper';
import { InsertRecordError } from '~collab/records/process-record-insertion';
import { ChangesetOperationError } from '~collab/changeset';

class NoteNotFoundError extends GraphQLError {
  constructor() {
    super('Note not found', {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
        resource: ResourceType.NOTE,
      },
    });
  }
}

class NoteUserNotFoundError extends GraphQLError {
  constructor() {
    super('Note user not found', {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
        resource: ResourceType.USER,
      },
    });
  }
}

class NoteReadOnlyError extends GraphQLError {
  constructor() {
    super(`Note is read-only`, {
      extensions: {
        code: GraphQLErrorCode.READ_ONLY,
        resource: ResourceType.NOTE,
      },
    });
  }
}

function newNoteErrorMapper() {
  const mapper = new ErrorMapper();
  mapper.add(NoteNotFoundServiceError, () => new NoteNotFoundError());
  mapper.add(NoteUserNotFoundServiceError, () => new NoteUserNotFoundError());
  mapper.add(NoteNotFoundQueryLoaderError, () => new NoteNotFoundError());
  mapper.add(NoteReadOnlyServiceError, () => new NoteReadOnlyError());

  mapper.add(NoteCollabRecordInsertError, (error) => {
    if (error.cause instanceof InsertRecordError) {
      switch (error.cause.code) {
        case 'REVISION_OLD':
          return new GraphQLError('Note is too old to make changes', {
            extensions: {
              code: GraphQLErrorCode.OUTDATED,
            },
          });
        case 'REVISION_INVALID':
          return new GraphQLError('Note new record revision is invalid', {
            extensions: {
              code: GraphQLErrorCode.INVALID_INPUT,
              input: InputType.REVISION,
            },
          });
      }
    } else if (error.cause instanceof ChangesetOperationError) {
      return new GraphQLError('Note new record changeset is invalid', {
        extensions: {
          code: GraphQLErrorCode.INVALID_INPUT,
          input: InputType.CHANGESET,
        },
      });
    }
    return;
  });

  return mapper;
}

export function formatError(error: unknown) {
  const mapper = newNoteErrorMapper();

  return mapper.get(error);
}
