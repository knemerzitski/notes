import { ApolloCache, isReference, Reference } from '@apollo/client';
import { ApolloOperation } from '../../../__generated__/graphql';

export function removeOngoingOperation(
  id: ApolloOperation['id'] | Reference,
  cache: Pick<ApolloCache<unknown>, 'evict' | 'identify' | 'gc'>
) {
  const result = cache.evict({
    id: isReference(id)
      ? cache.identify(id)
      : cache.identify({
          __typename: 'ApolloOperation',
          id,
        }),
  });

  if (result) {
    cache.gc();
  }

  return result;
}
