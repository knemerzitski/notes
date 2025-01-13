import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { SignedInUser, UserOperation } from '../../../__generated__/graphql';

const RemoveUserOperation_Query = gql(`
  query RemoveUserOperation_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        operations {
          id
        }
      }
    }
  }
`);

export function removeUserOperations(
  userId: SignedInUser['id'],
  operationIds: UserOperation['id'][],
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  if (operationIds.length === 0) {
    return;
  }

  cache.updateQuery(
    {
      query: RemoveUserOperation_Query,
      variables: {
        id: userId,
      },
      overwrite: true,
    },
    (data) => {
      if (!data?.signedInUser) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          local: {
            ...data.signedInUser.local,
            operations: data.signedInUser.local.operations.filter(
              (op) => !operationIds.includes(op.id)
            ),
          },
        },
      };
    }
  );
}
