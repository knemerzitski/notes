import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLResolversContext } from '../context';
import { GraphQLFormattedError } from 'graphql';

function createErrorKey(err: GraphQLFormattedError) {
  return (
    err.message +
    (err.extensions
      ? Object.entries(err.extensions)
          .map(([key, value]) => `${key}:${String(value)}`)
          .join(';')
      : '')
  );
}

function commonErrorPath(err: GraphQLFormattedError, err2: GraphQLFormattedError) {
  if (!err.path) return err2.path;

  for (let i = 0; i < err.path.length; i++) {
    if (err.path[i] !== err2.path?.[i]) {
      return err.path.slice(0, i);
    }
  }

  return err.path;
}

/**
 * Groups errors that have same extensions and message.
 */
export class GroupDuplicateErrors implements ApolloServerPlugin<GraphQLResolversContext> {
  requestDidStart(
    _requestContext: GraphQLRequestContext<GraphQLResolversContext>
  ): Promise<void | GraphQLRequestListener<GraphQLResolversContext>> {
    return Promise.resolve({
      willSendResponse(requestContext): Promise<void> {
        const response = requestContext.response;
        if (response.body.kind !== 'single') return Promise.resolve();
        const errors = response.body.singleResult.errors;
        if (!errors) return Promise.resolve();

        const similarErrorsGrouped = errors.reduce<
          Record<string, [GraphQLFormattedError, ...GraphQLFormattedError[]]>
        >((map, err) => {
          const key = createErrorKey(err);
          const existingList = map[key];
          if (existingList) {
            existingList.push(err);
          } else {
            map[key] = [err];
          }
          return map;
        }, {});

        const uniqueErrors = Object.values(similarErrorsGrouped).flatMap((errList) =>
          errList.reduce((combinedErr, err) => {
            const commonPath = commonErrorPath(combinedErr, err);
            if (!commonPath) {
              return combinedErr;
            }

            return {
              ...combinedErr,
              path: commonPath,
            };
          })
        );

        response.body.singleResult.errors =
          uniqueErrors.length > 0 ? uniqueErrors : undefined;

        return Promise.resolve();
      },
    });
  }
}
