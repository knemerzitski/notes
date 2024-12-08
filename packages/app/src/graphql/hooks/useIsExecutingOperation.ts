import { Operation, useApolloClient } from '@apollo/client';

import isEqual from 'lodash.isequal';
import { useEffect, useRef, useState } from 'react';

import { gql } from '../../__generated__';
import { ApolloOperation, Maybe, SignedInUser } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { setOperationUserId } from '../link/current-user';
import { getAllOngoingOperations } from '../link/persist/get-all';

const UseIsExecutingOperation_Query = gql(`
  query UseIsExecutingOperation_Query {
    ongoingOperations {
      id
      operationName
      variables
    }
  }
`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-parameters
export function useIsExecutingOperation<TVariables extends Record<string, any>>(
  operationName: Maybe<string>,
  variables?: TVariables
) {
  const userId = useUserId(true);
  const variablesRef = useRef(variables);
  variablesRef.current = variables;

  const client = useApolloClient();

  const [isExecuting, setIsExecuting] = useState<boolean>(() =>
    getAllOngoingOperations(client.cache).some((op) =>
      isSameOperation(
        {
          operationName,
          variables: variablesRef.current,
          userId,
        },
        op
      )
    )
  );

  useEffect(() => {
    const observable = client.watchQuery({
      query: UseIsExecutingOperation_Query,
      fetchPolicy: 'cache-only',
    });

    const sub = observable.subscribe((value) => {
      setIsExecuting(
        value.data.ongoingOperations.some((op) =>
          isSameOperation(
            {
              operationName,
              variables: variablesRef.current,
              userId,
            },
            op
          )
        )
      );
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, operationName, userId]);

  if (!operationName) {
    return false;
  }

  return isExecuting;
}

function isSameOperation(
  cond: {
    operationName: Maybe<Operation['operationName']>;
    variables?: Operation['variables'];
    userId?: Maybe<SignedInUser['id']>;
  },
  ongoingOperation: Pick<ApolloOperation, 'operationName' | 'variables'>
) {
  if (!cond.operationName) {
    return false;
  }

  if (ongoingOperation.operationName !== cond.operationName) {
    return false;
  }

  if (!cond.variables) {
    return true;
  }

  const checkOperation = {
    variables: cond.variables,
  };

  setOperationUserId(checkOperation, cond.userId);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const ongoingVariables = JSON.parse(ongoingOperation.variables);

  const definedVariablesMatch = Object.entries(checkOperation.variables).every(
    ([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return isEqual(ongoingVariables[key], value);
    }
  );
  if (definedVariablesMatch) {
    return true;
  }

  return false;
}
