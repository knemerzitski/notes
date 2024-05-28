import { keyArgsFnFromSpecifier } from '@apollo/client/cache/inmemory/key-extractor';
import { KeySpecifier, KeyArgsFunction } from '@apollo/client/cache/inmemory/policies';
import mapObject from 'map-obj';

export interface CustomKeyArgsFnParams {
  keyArgs?: false | KeySpecifier | KeyArgsFunction | undefined;
  /**
   * Sets args value from result of the function by the key
   */
  customArgsFnMap?: Record<string, () => unknown>;
}

/**
 * Add custom arguments when field is added to cache
 */
export default function customKeyArgsFn({
  keyArgs,
  customArgsFnMap,
}: CustomKeyArgsFnParams): false | KeySpecifier | KeyArgsFunction | undefined {
  if (!customArgsFnMap) {
    return keyArgs;
  }
  const customKeySpecifier = Object.keys(customArgsFnMap);
  if (customKeySpecifier.length === 0) {
    return keyArgs;
  }

  const keySpecifier = Array.isArray(keyArgs)
    ? [...keyArgs, ...customKeySpecifier]
    : customKeySpecifier;

  const keyArgsFn =
    typeof keyArgs === 'function' ? keyArgs : keyArgsFnFromSpecifier(keySpecifier);
  return (args, context) => {
    return keyArgsFn(
      {
        ...args,
        ...mapObject(customArgsFnMap, (arg, valueFn) => [arg, valueFn()]),
      },
      context
    );
  };
}
