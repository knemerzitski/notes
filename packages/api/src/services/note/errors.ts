import { ObjectId } from 'mongodb';
import { ServiceError } from '../errors';
import { objectIdToStr } from '../../mongodb/utils/objectid';

export type NoteServiceErrorCode =
  | 'NOTE_NOT_FOUND'
  | 'NOTE_USER_NOT_FOUND'
  | 'NOTE_USER_UNAUTHORIZED';

export class NoteServiceError extends ServiceError<NoteServiceErrorCode> {}

export class NoteNotFoundServiceError extends NoteServiceError {
  readonly noteId: ObjectId;

  constructor(noteId: ObjectId) {
    super('NOTE_NOT_FOUND', `Note '${objectIdToStr(noteId)}' not found`);
    this.noteId = noteId;
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
