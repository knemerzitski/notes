import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import isArray from '~utils/array/isArray';

export default function isErrorCode(
  err:
    | Readonly<ApolloError>
    | Readonly<GraphQLError>
    | Readonly<GraphQLError[]>
    | undefined,
  code: GraphQLErrorCode
) {
  if (!err) return false;
  let firstError: GraphQLError | undefined;
  if ('graphQLErrors' in err) {
    firstError = err.graphQLErrors[0];
  } else if ('extensions' in err) {
    firstError = err;
  } else if (isArray(err)) {
    firstError = err[0];
  }

  if (!firstError) return false;

  const firstCode = firstError.extensions.code;
  return firstCode === code;
}
