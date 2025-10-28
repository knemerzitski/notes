import { GraphQLError } from 'graphql/index.js';

import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '../../../../api-app-shared/src/graphql/error-codes';

import { UnauthenticatedServiceError } from '../../services/auth/errors';
import { ErrorFormatterFn } from '../errors';
import { UserNotFoundQueryLoaderError } from '../../mongodb/loaders/user/loader';

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

export const formatError: ErrorFormatterFn = function (error) {
  if (error instanceof UnauthenticatedServiceError) {
    return new UnauthenticatedError(error.reason);
  }

  if (error instanceof UserNotFoundQueryLoaderError) {
    return new UnauthenticatedError(AuthenticationFailedReason.USER_NOT_FOUND);
  }

  return;
};
