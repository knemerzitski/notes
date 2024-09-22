import { ObjectId } from 'mongodb';
import { ServiceError } from '../errors';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { ChangesetError } from '~collab/changeset';

export type NoteServiceErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'NOTE_READ_ONLY'
  | 'NOTE_UNAUTHORIZED'
  | 'NOTE_USER_NOT_FOUND'
  | 'NOTE_USER_UNAUTHORIZED'
  | 'NOTE_COLLAB_RECORD_INSERT';

export class NoteServiceError extends ServiceError<NoteServiceErrorCode> {}

export class NoteCollabRecordInsertError extends NoteServiceError {
  readonly noteId: ObjectId;
  override readonly cause: ChangesetError;

  constructor(noteId: ObjectId, cause: ChangesetError) {
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
