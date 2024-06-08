// TODO plugin is not used and can be deleted
import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLError, GraphQLErrorOptions } from 'graphql';

const REMOVE_ERROR_MARK = 'removeResolverOnlyError';

/**
 * Throw this error to notify child resolvers that data is not available.
 * This prevents cascading errors "null in a non-nullable field" from child resolvers.
 *
 * Requires plugin {@link RemoveResolverOnlyErrors} in ApolloServer.
 *
 */
export function newResolverOnlyError(message?: string, options?: GraphQLErrorOptions) {
  return new GraphQLError(message ?? 'This error should be removed from response', {
    ...options,
    extensions: {
      ...options?.extensions,
      [REMOVE_ERROR_MARK]: true,
    },
  });
}

/**
 * Removes errors that have extension {@link REMOVE_ERROR_MARK} set to truthy value.
 * @see {@link newResolverOnlyError}
 */
export class RemoveResolverOnlyErrors<TContext extends BaseContext>
  implements ApolloServerPlugin<TContext>
{
  requestDidStart(
    _requestContext: GraphQLRequestContext<TContext>
  ): Promise<void | GraphQLRequestListener<TContext>> {
    return Promise.resolve({
      willSendResponse(requestContext): Promise<void> {
        const response = requestContext.response;
        if (response.body.kind !== 'single') return Promise.resolve();
        const errors = response.body.singleResult.errors;
        if (!errors) return Promise.resolve();

        const markedErrorsRemoved = errors.filter(
          (error) => !error.extensions?.[REMOVE_ERROR_MARK]
        );

        response.body.singleResult.errors =
          markedErrorsRemoved.length > 0 ? markedErrorsRemoved : undefined;

        return Promise.resolve();
      },
    });
  }
}
