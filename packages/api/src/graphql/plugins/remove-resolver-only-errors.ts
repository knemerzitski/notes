import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLResolversContext } from '../context';
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
export class RemoveResolverOnlyErrors
  implements ApolloServerPlugin<GraphQLResolversContext>
{
  requestDidStart(
    _requestContext: GraphQLRequestContext<GraphQLResolversContext>
  ): Promise<void | GraphQLRequestListener<GraphQLResolversContext>> {
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
