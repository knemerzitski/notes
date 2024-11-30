import { GraphQLError, GraphQLFormattedError } from 'graphql/index.js';
import { unwrapResolverError } from '@apollo/server/errors';
import { formatError as note_formatError } from './errors/note';
import { formatError as auth_formatError } from './errors/auth';

type ErrorFormatter = (error: unknown) => Error | undefined;

const errorFormatters: ErrorFormatter[] = [auth_formatError, note_formatError];

export function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  const originalError = unwrapResolverError(error);
  if (originalError instanceof GraphQLError) {
    return formattedError;
  }

  for (const formatErr of errorFormatters) {
    const modifiedError = formatErr(originalError);
    if (modifiedError) {
      return wrapResolverError(modifiedError, formattedError);
    }
  }

  return {
    ...formattedError,
    message: 'Something went wrong!',
  };
}

/**
 * Restore GraphQLError options from initial error if it's undefined
 */
function wrapResolverError(
  targetError: Error,
  formattedError: GraphQLFormattedError
): Error {
  if (
    !(targetError instanceof GraphQLError) ||
    !(formattedError instanceof GraphQLError)
  ) {
    return targetError;
  }

  return new GraphQLError(targetError.message, {
    nodes: targetError.nodes ?? formattedError.nodes,
    source: targetError.source ?? formattedError.source,
    positions: targetError.positions ?? formattedError.positions,
    path: targetError.path ?? formattedError.path,
    originalError: targetError.originalError ?? formattedError.originalError,
    extensions: {
      ...formattedError.extensions,
      ...targetError.extensions,
    },
  });
}
