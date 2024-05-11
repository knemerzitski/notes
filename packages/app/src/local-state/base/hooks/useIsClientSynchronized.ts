import { useQuery } from '@apollo/client';
import { gql } from '../../../__generated__';

const QUERY = gql(`
  query UseIsClientSynchronized {
    isClientSynchronized @client
  }
`);

export default function useIsClientSynchronized() {
  const { data } = useQuery(QUERY, {
    fetchPolicy: 'cache-only',
  });

  return data?.isClientSynchronized ?? true;
}
