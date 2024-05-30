import { keyArgsFnFromSpecifier } from '@apollo/client/cache/inmemory/key-extractor';
import { KeySpecifier, KeyArgsFunction } from '@apollo/client/cache/inmemory/policies';
import mapObject, { mapObjectSkip } from 'map-obj';

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

  let keyArgsFn: KeyArgsFunction;
  if (typeof keyArgs === 'function') {
    keyArgsFn = keyArgs;
  } else if (Array.isArray(keyArgs)) {
    keyArgsFn = keyArgsFnFromSpecifier([...keyArgs, ...customKeySpecifier]);
  } else {
    keyArgsFn = keyArgsFnFromSpecifier(customKeySpecifier);
  }

  return (args, context) => {
    const customArgs = mapObject(customArgsFnMap, (arg, valueFn) => {
      const value = valueFn();
      if (value === undefined) {
        return mapObjectSkip;
      }
      return [arg, valueFn()];
    });

    if (Object.keys(customArgs).length === 0) {
      return typeof keyArgs === 'function' ? keyArgs(args, context) : keyArgs;
    }

    return keyArgsFn(
      {
        ...args,
        ...customArgs,
      },
      context
    );
  };
}
