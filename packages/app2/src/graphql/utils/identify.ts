import { StoreObject, Reference, ApolloCache } from '@apollo/client';

export function identifyOrError(
  object: StoreObject | Reference,
  cache: Pick<ApolloCache<unknown>, 'identify'>
): string {
  const dataId = cache.identify(object);
  if (!dataId) {
    throw new Error(`Failed to identify cache object "${JSON.stringify(object)}"`);
  }
  return dataId;
}
