import { AuthenticationFailedReason } from '../../../../api-app-shared/src/graphql/error-codes';

import { ServiceError } from '../errors';

export type AuthServiceErrorCode = 'UNAUTHENTICATED';

export class AuthServiceError extends ServiceError<AuthServiceErrorCode> {}

export class UnauthenticatedServiceError extends AuthServiceError {
  readonly reason: AuthenticationFailedReason | undefined;

  constructor(reason: AuthenticationFailedReason | undefined) {
    super('UNAUTHENTICATED', 'User is not authenticated');
    this.reason = reason;
  }
}
