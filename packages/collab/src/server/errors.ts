export class ServerError extends Error {}

type RecordSubmissionErrorCode =
  | 'REVISION_INVALID'
  | 'REVISION_OLD'
  | 'CHANNGESET_INVALID';

export class RecordSubmissionServerError extends ServerError {
  constructor(
    readonly code: RecordSubmissionErrorCode,
    message?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}
