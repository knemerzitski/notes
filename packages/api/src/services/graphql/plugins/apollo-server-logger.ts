import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { Logger } from '~utils/logging';

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
        const firstError = ctx.errors[0];
        if (!firstError) return Promise.resolve();

        this.logger.error(`request:errors`, firstError, {
          allErrors: ctx.errors,
        });

        return Promise.resolve();
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
