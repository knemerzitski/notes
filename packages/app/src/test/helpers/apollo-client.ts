import { InMemoryCache } from '@apollo/client';
import typePolicies from '../../apollo/typePolicies';

export function createCache() {
  return new InMemoryCache({
    typePolicies,
  });
}
