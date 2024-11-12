import { GraphQLError } from 'graphql/index.js';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { UnauthenticatedContext } from '../../services/auth/authentication-context';
import { UnauthenticatedServiceError } from '../../services/auth/errors';

class UnauthenticatedError extends GraphQLError {
  constructor(context: UnauthenticatedContext | undefined) {
    super('You must be signed in to perform this action.', {
      extensions: {
        code: GraphQLErrorCode.UNAUTHENTICATED,
        reason: context?.reason,
      },
    });
  }
}

export function formatError(error: unknown) {
  if (error instanceof UnauthenticatedServiceError) {
    return new UnauthenticatedError(error.context);
  }

  return;
}
