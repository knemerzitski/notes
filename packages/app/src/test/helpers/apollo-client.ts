import { InMemoryCache } from '@apollo/client';
import { typePolicies } from '../../modules/apollo-client/policies';

export function createCache() {
  return new InMemoryCache({
    typePolicies,
  });
}
