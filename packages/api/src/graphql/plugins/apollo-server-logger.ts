import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError } from 'graphql/index.js';

import { Logger } from '../../../../utils/src/logging';

export class ApolloServerLogger<TContext extends BaseContext>
  implements ApolloServerPlugin<TContext>
{
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  requestDidStart(
    requestContext: GraphQLRequestContext<TContext>
  ): Promise<void | GraphQLRequestListener<TContext>> {
    const requestStartTime = performance.now();

    this.logger.info(`request:started`, {
      method: requestContext.request.http?.method,
      search: requestContext.request.http?.search,
      headers: requestContext.request.http?.headers,
      query: requestContext.request.query,
    });

    return Promise.resolve({
      didEncounterErrors: async (ctx) => {
        const errors = ctx.errors;
        if (errors.length === 0) return Promise.resolve();

        this.logger.error('request:errors', errors.map(mapErrorWithOriginal));
      },
      willSendResponse: () => {
        const requestDuration =
          Math.round((performance.now() - requestStartTime + Number.EPSILON) * 100) / 100;

        this.logger.info(`request:completed`, {
          operationName: requestContext.operationName,
          duration: requestDuration,
        });

        return Promise.resolve();
      },
    });
  }
}

function mapErrorWithOriginal(error: GraphQLError) {
  const originalError = unwrapResolverError(error);
  if (originalError === error) {
    return error;
  }

  if (!(originalError instanceof Error) || originalError.stack !== error.stack) {
    return error;
  }

  // Stack is equal in 'error' and 'originalError', remove it from 'error'

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    graphQLError: errorWithoutStack(error),
    originalError: originalError,
  };
}

function errorWithoutStack(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
  const copy = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  delete copy.stack;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return copy;
}
