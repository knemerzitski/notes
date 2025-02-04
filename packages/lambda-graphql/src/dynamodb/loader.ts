import DataLoader from 'dataloader';

import { sortObject } from '~utils/object/sort-object';
import { DefinedMap } from '~utils/map/defined-map';
import { OmitUndefined } from '~utils/types';

export type ObjectLoader<
  TObject extends object,
  TFnName extends keyof TObject & string,
> = OmitUndefined<{
  [K in TFnName]: TObject[K] extends (...args: infer TArgs) => infer TResult
    ? (...args: TArgs) => TResult extends Promise<unknown> ? TResult : Promise<TResult>
    : undefined;
}>;

/**
 * @param targetObject Object to be proxied
 * @param functionNames Object properties to wrap in a DataLoader
 * @returns Proxied {@link targetObject} that memos {@link functionNames} using a DataLoader
 */
export function createObjectLoader<
  TObject extends object,
  TFnName extends keyof TObject & string,
>(targetObject: TObject, functionNames: TFnName[]): ObjectLoader<TObject, TFnName> {
  interface LoaderKey {
    name: string;
    args: unknown[];
  }

  const loader = new DataLoader<LoaderKey, unknown, string>(
    (keys) => {
      const valuePromiseByKey: Record<string, Promise<unknown>> = {};
      for (const key of keys) {
        const keyStr = unknownToIdentifierString(key);
        if (!(keyStr in valuePromiseByKey)) {
          // @ts-expect-error Correct function name is guaranteed by TypeScript
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
          valuePromiseByKey[keyStr] = targetObject[key.name](...key.args);
        }
      }

      return Promise.allSettled(
        keys.map(async (key) => await valuePromiseByKey[unknownToIdentifierString(key)])
      ).then((values) =>
        values.map((valueSettled) => {
          if (valueSettled.status === 'fulfilled') {
            return valueSettled.value;
          } else if (valueSettled.reason instanceof Error) {
            return valueSettled.reason;
          }
          return new Error(`Unknown rejected reason ${valueSettled.reason}`);
        })
      );
    },
    {
      cacheKeyFn: unknownToIdentifierString,
    }
  );

  const namesSet = new Set(functionNames);
  const loaderFunctionByName = new DefinedMap<keyof TObject, object>(
    new Map(),
    (fnName) => {
      return (...args: unknown[]) =>
        loader.load({
          name: String(fnName),
          args,
        });
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return new Proxy(targetObject, {
    get(target, p, receiver) {
      if (typeof p !== 'string' || !namesSet.has(p as TFnName)) {
        return Reflect.get(target, p, receiver);
      }

      return loaderFunctionByName.get(p as TFnName);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

function unknownToIdentifierString(key: unknown): string {
  return JSON.stringify(
    sortObject(key, {
      exclude: excludeIsUndefined,
    }),
    null,
    undefined
  );
}

function excludeIsUndefined({ value }: { value: unknown }) {
  return value === undefined;
}
