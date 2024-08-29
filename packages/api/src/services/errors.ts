export class ServiceError<TCode extends string> extends Error {
  readonly code: TCode;

  constructor(code: TCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}
