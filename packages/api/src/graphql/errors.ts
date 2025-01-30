import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError, GraphQLFormattedError } from 'graphql/index.js';

import { formatError as auth_formatError } from './errors/auth';
import { formatError as note_formatError } from './errors/note';

export type ErrorFormatterFn = (error: unknown) => Error | undefined;

const errorFormatters: ErrorFormatterFn[] = [auth_formatError, note_formatError];

export function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  const originalError = unwrapResolverError(error);
  // If original error is already GraphQLError then don't need to format it any further
  if (originalError instanceof GraphQLError) {
    return formattedError;
  }

  // Loop custom list of formatters until a GraphQLError is received
  for (const formatErr of errorFormatters) {
    const modifiedError = formatErr(originalError);
    if (modifiedError instanceof GraphQLError) {
      return mergeWithInitialFormattedError(modifiedError, formattedError);
    }
  }

  return {
    ...formattedError,
    message: 'Something went wrong!',
  };
}

function mergeWithInitialFormattedError(
  targetError: GraphQLError,
  formattedError: GraphQLFormattedError
): GraphQLFormattedError {
  const formattedTargetError = targetError.toJSON();
  return {
    ...formattedError,
    ...formattedTargetError,
    extensions: {
      ...formattedError.extensions,
      ...formattedTargetError.extensions,
    },
  };
}
