import { InMemoryCache } from '@apollo/client';
import typePolicies from '../../apollo/policies';

export function createCache() {
  return new InMemoryCache({
    typePolicies,
  });
}
