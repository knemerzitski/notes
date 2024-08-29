import { ObjectId } from 'mongodb';
import { ServiceError } from '../errors';

export type NoteErrorCode = 'NOT_FOUND';

export class NoteError extends ServiceError<NoteErrorCode> {}

export class NoteNotFoundError extends NoteError {
  readonly noteId: ObjectId;

  constructor(noteId: ObjectId, message?: string, options?: ErrorOptions) {
    super('NOT_FOUND', message ?? 'Note not found', options);
    this.noteId = noteId;
  }
}
