import { GraphQLResolveInfo } from 'graphql/index.js';

import { preExecuteObjectField } from './pre-execute';

/**
 * Pre-execute resolver and pass it down to child resolvers only if condition is true
 */
export function wrapResolverPreExecuteCheck<
  TArgs extends [unknown, unknown, unknown, GraphQLResolveInfo],
  TReturn,
>(
  condProceedFn: (
    parent: TArgs[0],
    args: TArgs[1],
    ctx: TArgs[2],
    info: TArgs[3]
  ) => Promise<boolean>,
  resolver: (...args: TArgs) => TReturn
): (...args: TArgs) => Promise<TReturn | null> {
  return async (...args) => {
    const returnValue = resolver(...args);
    const [canProceed] = await Promise.all([
      condProceedFn(args[0], args[1], args[2], args[3]),
      preExecuteObjectField<TArgs[2], TReturn>(returnValue, args[2], args[3]),
    ]);
    if (!canProceed) {
      return null;
    }
    return returnValue;
  };
}
