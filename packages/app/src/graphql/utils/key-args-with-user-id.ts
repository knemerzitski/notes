import { KeyArgsFunction, KeySpecifier } from '@apollo/client/cache/inmemory/policies';
import { keyArgsFnFromSpecifier } from '@apollo/client/cache/inmemory/key-extractor';
import { isDefined } from '~utils/type-guards/is-defined';
import { TypePoliciesContext } from '../types';

const SEPARATOR = '-';

/**
 * Returns new keyArgs that always includes current user id in key.
 * Can be used to separate query for each user in same cache.
 */
export function keyArgsWithUserId(
  policiesCtx: TypePoliciesContext,
  keyArgs?: KeySpecifier | KeyArgsFunction | false
): KeyArgsFunction {
  const baseKeyArgsFn = getKeyArgsFn(keyArgs);

  return (args, argsCtx) => {
    const userId =
      argsCtx.variables?.[policiesCtx.variablesUserIdKey] ??
      policiesCtx.appContext.userId;

    const suffix = userId
      ? JSON.stringify({
          userId: userId,
        })
      : undefined;

    const base = baseKeyArgsFn?.(args, argsCtx);
    if (base) {
      if (typeof base !== 'string') {
        throw new Error(
          `Expected keyArgs "${String(keyArgs)}" to resolve to string but is "${String(base)}"`
        );
      }
      return [base, suffix].filter(isDefined).join(SEPARATOR);
    }

    return suffix;
  };
}

function getKeyArgsFn(keyArgs: KeySpecifier | KeyArgsFunction | false | undefined) {
  if (typeof keyArgs === 'function') {
    return keyArgs;
  } else if (keyArgs) {
    return keyArgsFnFromSpecifier(keyArgs);
  }

  return;
}
