import { ApolloCache } from '@apollo/client';

import { nanoid } from 'nanoid';
import { DistributivePartialBy } from '~utils/types';

import { gql } from '../../../__generated__';
import { AddUserOperationQueryQuery, SignedInUser } from '../../../__generated__/graphql';

const AddUserOperation_Query = gql(`
  query AddUserOperation_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        operations {
          id
          ... on DeleteNoteUserOperation {
            userNoteLink {
              id
            }
          }
          ... on TrashNoteUserOperation {
            userNoteLink {
              id
            }
          }
          ... on MoveNoteUserOperation {
            userNoteLink {
              id
            }
            location {
              categoryName
              anchorUserNoteLink {
                id
              }
              anchorPosition
            }
          }
        }
      }
    }
  }
`);

type Operation = NonNullable<
  AddUserOperationQueryQuery['signedInUser']
>['local']['operations'][0];

export function addUserOperations(
  userId: SignedInUser['id'],
  operations: DistributivePartialBy<Operation, 'id'>[],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  if (operations.length === 0) {
    return;
  }

  cache.writeQuery({
    query: AddUserOperation_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'SignedInUser',
        id: userId,
        local: {
          __typename: 'LocalSignedInUser',
          id: userId,
          operations: operations.map<Operation>((op) => ({
            id: op.id ?? nanoid(),
            ...op,
          })),
        },
      },
    },
  });
}
