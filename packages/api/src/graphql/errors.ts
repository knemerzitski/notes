import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import { formatError as note_formatError } from './errors/note';

type ErrorFormatter = (error: unknown) => Error | undefined;

const errorFormatters: ErrorFormatter[] = [note_formatError];

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
      return wrapResolverError(modifiedError, error);
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
function wrapResolverError(error: Error, initialError: unknown): Error {
  if (!(error instanceof GraphQLError) || !(initialError instanceof GraphQLError)) {
    return error;
  }

  return new GraphQLError(error.message, {
    nodes: error.nodes ?? initialError.nodes,
    source: error.source ?? initialError.source,
    positions: error.positions ?? initialError.positions,
    path: error.path ?? initialError.path,
    originalError: error.originalError ?? initialError.originalError,
    extensions: error.extensions,
  });
}
