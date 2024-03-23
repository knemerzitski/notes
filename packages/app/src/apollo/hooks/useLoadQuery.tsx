import {
  ApolloError,
  OperationVariables,
  QueryOptions,
  useApolloClient,
} from '@apollo/client';
import { useState, useEffect } from 'react';

/**.
 * This hook is intented for prefetching all required data at once with single
 * network request. No data is returned.
 * It's expected that required data is queried by a child component separately.
 */
export default function useLoadQuery<
  T = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: QueryOptions<TVariables, T>['query'],
  options?: Omit<QueryOptions<TVariables, T>, 'query'>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApolloError | true>();
  const client = useApolloClient();

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(undefined);

      const result = await client.query({
        query,
        ...options,
      });

      // Result is undefined on error. Must be a bug in typing.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (result) {
        setLoading(result.loading);
        setError(result.error);
      } else {
        setError(true);
      }
    }
    void fetch();
  }, [client, query, options]);

  return { loading, error };
}
