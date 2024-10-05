import { ApolloCache } from '@apollo/client';
import { ApolloOperation } from '../../../__generated__/graphql';
import { isObjectLike } from '~utils/type-guards/is-object-like';

export function removeOngoingOperation(
  id: ApolloOperation['id'],
  cache: Pick<ApolloCache<unknown>, 'evict' | 'identify' | 'modify'>
) {
  cache.evict({
    id: cache.identify({
      __typename: 'ApolloOperation',
      id,
    }),
  });

  cache.modify({
    fields: {
      ongoingOperations(existing = {}) {
        if (!isObjectLike(existing)) {
          return existing;
        }

        const modified = { ...existing };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete modified[id];

        return modified;
      },
    },
  });
}
