import { GraphQLError } from 'graphql/index.js';
import { ObjectId } from 'mongodb';

import {
  GraphQLErrorCode,
  ResourceType,
  InputType,
} from '../../../../api-app-shared/src/graphql/error-codes';

import { RecordSubmissionServerError } from '../../../../collab/src';
import { NoteNotFoundQueryLoaderError } from '../../mongodb/loaders/note/loader';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import {
  NoteByShareLinkNotFoundServiceError,
  NoteCollabRecordInsertError,
  NoteCollabTextInvalidRevisionError,
  NoteNotFoundServiceError,
  NoteNotOpenedServiceError,
  NoteReadOnlyServiceError,
  NoteUserCountLimitReachedServiceError,
  NoteUserNotFoundServiceError,
} from '../../services/note/errors';

import { ErrorFormatterFn } from '../errors';

import { ErrorMapper } from './utils/error-mapper';

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

export class NoteUnauthorizedUserError extends GraphQLError {
  constructor(currentUserId: ObjectId, noteAccessUserId: ObjectId) {
    super(
      `Attempted to access note as user "${objectIdToStr(noteAccessUserId)}" while authenticated as user "${objectIdToStr(currentUserId)}"`,
      {
        extensions: {
          code: GraphQLErrorCode.UNAUTHORIZED,
        },
      }
    );
  }
}

class NoteUsersLimitReachedError extends GraphQLError {
  constructor() {
    super('Users count limit reached', {
      extensions: {
        code: GraphQLErrorCode.LIMIT_REACHED,
        resource: ResourceType.USER,
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
  mapper.add(NoteByShareLinkNotFoundServiceError, () => new NoteNotFoundError());
  mapper.add(
    NoteUserCountLimitReachedServiceError,
    () => new NoteUsersLimitReachedError()
  );

  mapper.add(NoteCollabRecordInsertError, (error) => {
    if (error.cause instanceof RecordSubmissionServerError) {
      switch (error.cause.code) {
        case 'REVISION_OLD':
          return new GraphQLError('Submitted changes are too old', {
            extensions: {
              code: GraphQLErrorCode.OUTDATED,
            },
          });
        case 'REVISION_INVALID':
          return new GraphQLError('Submitted changes revision is invalid', {
            extensions: {
              code: GraphQLErrorCode.INVALID_INPUT,
              input: InputType.REVISION,
            },
          });
        case 'CHANNGESET_INVALID':
          return new GraphQLError('Submitted changeset is invalid', {
            extensions: {
              code: GraphQLErrorCode.INVALID_INPUT,
              input: InputType.CHANGESET,
            },
          });
      }
    }
    return;
  });

  mapper.add(
    NoteNotOpenedServiceError,
    () =>
      new GraphQLError('Note has not been opened. Must subscribe to "openNoteEvents".', {
        extensions: {
          code: GraphQLErrorCode.INVALID_OPERATION,
        },
      })
  );
  mapper.add(
    NoteCollabTextInvalidRevisionError,
    (error) =>
      new GraphQLError(
        `Invalid revision. Expected between [${error.minRevision},${error.maxRevision}]`
      )
  );

  return mapper;
}

export const formatError: ErrorFormatterFn = function (error) {
  const mapper = newNoteErrorMapper();

  return mapper.get(error);
};
