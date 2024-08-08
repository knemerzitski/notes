import {
  DocumentNode,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  TypedDocumentNode,
  useQuery,
} from '@apollo/client';
import { useRef } from 'react';

/**
 * Query is set on standby when isPaused is true. When paused, previous saved query
 * result is returned.
 */
export function usePauseableQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  isPaused: boolean,
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>
): QueryResult<TData, TVariables> {
  const savedResultRef = useRef<QueryResult<TData, TVariables>>();

  const modifiedOptions: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>> = {
    ...options,
    fetchPolicy:
      isPaused && savedResultRef.current?.loading != null
        ? 'standby'
        : options?.fetchPolicy,
  };

  const result = useQuery(query, modifiedOptions);

  if (!isPaused || (!result.loading && !savedResultRef.current)) {
    savedResultRef.current = result;
  }

  if (isPaused && savedResultRef.current) {
    return savedResultRef.current;
  }

  return result;
}
