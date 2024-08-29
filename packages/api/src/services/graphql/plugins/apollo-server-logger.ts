import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { Logger } from '~utils/logging';
import { unwrapResolverError } from '@apollo/server/errors';

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

        this.logger.error(
          'request:errors',
          errors.map((error) => {
            const originalError = unwrapResolverError(error);
            if (originalError !== error) {
              return {
                graphQLError: proxyMaskStack(error),
                originalError: originalError,
              };
            } else {
              return error;
            }
          })
        );
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

/**
 * Error with property 'stack' proxied to undefined
 */
function proxyMaskStack(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return new Proxy(error, {
    get: (...args) => {
      const [_target, p] = args;
      if (p === 'stack') {
        return;
      }
      return Reflect.get(...args);
    },
    has(...args) {
      const [_target, p] = args;
      if (p === 'stack') {
        return false;
      }
      return Reflect.get(...args);
    },
  });
}
