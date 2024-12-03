import { ExecutionContext } from 'graphql/execution/execute.js';
import { GraphQLError, GraphQLFormattedError } from 'graphql/index.js';
import { Path } from 'graphql/jsutils/Path.js';

import { getResolverArgs } from './get-resolver-args';

function collectPath(path: Path): string[] {
  if (path.prev) {
    return [...collectPath(path.prev), String(path.key)];
  } else {
    return [String(path.key)];
  }
}

export type FormatError = (
  formattedError: GraphQLFormattedError,
  error: unknown
) => GraphQLFormattedError;

export interface FormatErrorOptions {
  /**
   * @default false
   */
  includeStacktrace?: boolean;
}

export function formatUnknownError(
  error: unknown,
  formatError: FormatError,
  options?: {
    exeContext?: ExecutionContext;
    extraPath?: string[] | string;
    /**
     * @default false
     */
  } & FormatErrorOptions
): GraphQLError {
  let graphQLError: GraphQLError;
  if (error instanceof GraphQLError) {
    graphQLError = error;
  } else {
    graphQLError = new GraphQLError(getErrorMessage(error), {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
      path: getPathFromOptions(options),
    });
  }

  return formattedToGraphQLError(
    formatError(processGraphQLFormatErrorOptions(graphQLError, options), error)
  );
}

function processGraphQLFormatErrorOptions(
  error: GraphQLError,
  options?: FormatErrorOptions
) {
  if (options?.includeStacktrace) {
    error.extensions.stacktrace = error.stack;
  }
  return error;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  } else {
    return `Unexpected error value "${String(error)}"`;
  }
}

function getPathFromOptions(options?: Parameters<typeof formatUnknownError>[2]) {
  const extraPath = options?.extraPath
    ? Array.isArray(options.extraPath)
      ? options.extraPath
      : [options.extraPath]
    : [];

  if (!options?.exeContext) {
    return extraPath;
  }

  const { info } = getResolverArgs(options.exeContext);
  return [...collectPath(info.path), ...extraPath];
}

function formattedToGraphQLError(formattedError: GraphQLFormattedError): GraphQLError {
  if (formattedError instanceof GraphQLError) {
    return formattedError;
  }

  //@ts-expect-error Properties are defined using assign
  const error = new GraphQLError();
  Object.assign(error, formattedError);
  return error;
}
