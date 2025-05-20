import { ObjectId } from 'mongodb';

import { ServerError } from '../../../../collab/src';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { ServiceError } from '../errors';

export type NoteServiceErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'NOTE_READ_ONLY'
  | 'NOTE_UNAUTHORIZED'
  | 'NOTE_USER_NOT_FOUND'
  | 'NOTE_USER_UNAUTHORIZED'
  | 'NOTE_COLLAB_RECORD_INSERT'
  | 'NOTE_SHARE_LINK_NOTE_FOUND'
  | 'NOTE_NOT_OPENED'
  | 'NOTE_COLLAB_TEXT_INVALID_REVISION'
  | 'NOTE_USERS_COUNT_LIMIT_REACHED';

export class NoteServiceError extends ServiceError<NoteServiceErrorCode> {}

export class NoteCollabRecordInsertError extends NoteServiceError {
  readonly noteId: ObjectId;
  override readonly cause: ServerError;

  constructor(noteId: ObjectId, cause: ServerError) {
    super(
      'NOTE_COLLAB_RECORD_INSERT',
      `Note '${objectIdToStr(noteId)}' failed to insert record: ${cause.message}`
    );
    this.noteId = noteId;
    this.cause = cause;
  }
}

export class NoteReadOnlyServiceError extends NoteServiceError {
  readonly noteId: ObjectId;

  constructor(noteId: ObjectId) {
    super('NOTE_READ_ONLY', `Note '${objectIdToStr(noteId)}' is read-only`);
    this.noteId = noteId;
  }
}

export class NoteNotFoundServiceError extends NoteServiceError {
  readonly noteId: ObjectId;

  constructor(noteId: ObjectId) {
    super('NOTE_NOT_FOUND', `Note '${objectIdToStr(noteId)}' not found`);
    this.noteId = noteId;
  }
}

export class NoteByShareLinkNotFoundServiceError extends NoteServiceError {
  readonly shareLinkId: ObjectId;

  constructor(shareLinkId: ObjectId) {
    super(
      'NOTE_SHARE_LINK_NOTE_FOUND',
      `Note by share link '${objectIdToStr(shareLinkId)}' not found`
    );
    this.shareLinkId = shareLinkId;
  }
}

export class NoteUnauthorizedServiceError extends NoteServiceError {
  readonly userId: ObjectId;

  constructor(userId: ObjectId, message: string) {
    super(
      'NOTE_UNAUTHORIZED',
      `Note user '${objectIdToStr(userId)}' lacks permissions: ${message}`
    );
    this.userId = userId;
  }
}

export class NoteUserNotFoundServiceError extends NoteServiceError {
  readonly userId: ObjectId;
  readonly noteId: ObjectId;

  constructor(userId: ObjectId, noteId: ObjectId) {
    super(
      'NOTE_USER_NOT_FOUND',
      `Note user '${objectIdToStr(userId)}' not found in note '${objectIdToStr(noteId)}'`
    );
    this.userId = userId;
    this.noteId = noteId;
  }
}

export class NoteUserUnauthorizedServiceError extends NoteServiceError {
  readonly scopeUserId: ObjectId;
  readonly targetUserId: ObjectId;

  constructor(scopeUserId: ObjectId, targetUserId: ObjectId, message: string) {
    super(
      'NOTE_USER_UNAUTHORIZED',
      `Note user '${objectIdToStr(scopeUserId)}' has no authorization over note user '${objectIdToStr(targetUserId)}': ${message}`
    );
    this.scopeUserId = scopeUserId;
    this.targetUserId = targetUserId;
  }
}

export class NoteNotOpenedServiceError extends NoteServiceError {
  readonly userId: ObjectId;
  readonly noteId: ObjectId;
  readonly connectionId: string | undefined;

  constructor(userId: ObjectId, noteId: ObjectId, connectionId: string | undefined) {
    super(
      'NOTE_NOT_OPENED',
      `User '${objectIdToStr(userId)}' on connection '${connectionId}' has not opened note '${objectIdToStr(noteId)}'.`
    );
    this.userId = userId;
    this.noteId = noteId;
    this.connectionId = connectionId;
  }
}

export class NoteCollabTextInvalidRevisionError extends NoteServiceError {
  readonly revision: number;
  readonly minRevision: number | null;
  readonly maxRevision: number | null;

  constructor(revision: number, minRevision: number | null, maxRevision: number | null) {
    let message: string;
    if (minRevision != null && maxRevision != null) {
      if (minRevision !== maxRevision) {
        message = `Expected revision "${revision}" to be between ${minRevision} and ${maxRevision}`;
      } else {
        message = `Expected revision "${revision}" to equal ${minRevision}`;
      }
    } else if (minRevision != null) {
      message = `Expected revision "${revision}" to be greater or equal to ${minRevision}`;
    } else if (maxRevision != null) {
      message = `Expected revision "${revision}" to be less than or equal to ${maxRevision}`;
    } else {
      message = `Expected revision "${revision}" to not be invalid`;
    }
    super('NOTE_COLLAB_TEXT_INVALID_REVISION', message);

    this.revision = revision;
    this.minRevision = minRevision;
    this.maxRevision = minRevision;
  }
}

export class NoteUserCountLimitReachedServiceError extends NoteServiceError {
  constructor(readonly usersCount: number) {
    super(
      'NOTE_USERS_COUNT_LIMIT_REACHED',
      `Note users count limit reached ${usersCount}`
    );
  }
}
