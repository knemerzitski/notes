import { GraphQLError } from 'graphql/index.js';
import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '~api-app-shared/graphql/error-codes';

import { UnauthenticatedServiceError } from '../../services/auth/errors';

class UnauthenticatedError extends GraphQLError {
  constructor(reason: AuthenticationFailedReason | undefined) {
    super('You must be signed in to perform this action.', {
      extensions: {
        code: GraphQLErrorCode.UNAUTHENTICATED,
        reason: reason,
      },
    });
  }
}

export function formatError(error: unknown) {
  if (error instanceof UnauthenticatedServiceError) {
    return new UnauthenticatedError(error.reason);
  }

  return;
}
