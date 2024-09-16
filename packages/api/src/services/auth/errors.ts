import { ServiceError } from '../errors';
import { UnauthenticatedContext } from './authentication-context';

export type AuthServiceErrorCode = 'UNAUTHENTICATED';

export class AuthServiceError extends ServiceError<AuthServiceErrorCode> {}

export class UnauthenticatedServiceError extends AuthServiceError {
  readonly context: UnauthenticatedContext | undefined;

  constructor(context: UnauthenticatedContext | undefined) {
    super('UNAUTHENTICATED', 'User is not authenticated');
    this.context = context;
  }
}
