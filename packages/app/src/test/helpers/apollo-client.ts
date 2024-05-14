import { InMemoryCache } from '@apollo/client';
import typePolicies from '../../modules/apollo-client/typePolicies';

export function createCache() {
  return new InMemoryCache({
    typePolicies,
  });
}
