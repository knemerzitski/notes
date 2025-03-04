import { maybeCallFn } from '../../../../utils/src/maybe-call-fn';
import { Maybe } from '../../../../utils/src/types';

import { ResolverTypeWrapper } from '../domains/types.generated';

export async function unwrapResolverMaybe<T>(
  resolver: ResolverTypeWrapper<T>
): Promise<Maybe<T>> {
  const result = await maybeCallFn(resolver);

  return result;
}

export async function unwrapResolver<T>(resolver: ResolverTypeWrapper<T>): Promise<T> {
  const result = await unwrapResolverMaybe(resolver);
  if (result == null) {
    throw new Error(`Expected non-null resolver`);
  }

  return result;
}
