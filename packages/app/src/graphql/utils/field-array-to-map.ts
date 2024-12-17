import {
  FieldFunctionOptions,
  FieldPolicy,
  FieldReadFunction,
  Reference,
} from '@apollo/client';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';
import { KeySpecifier, KeyArgsFunction } from '@apollo/client/cache/inmemory/policies';

export interface FieldArrayToMapOptions<
  TKeyName extends string,
  TKeyValue extends string,
  TItem extends Record<TKeyName, TKeyValue> | Reference,
> {
  argName?: string;
  keyArgs?: false | KeySpecifier | KeyArgsFunction | undefined;
  read?: FieldReadFunction<
    Partial<Record<TKeyValue, TItem>>,
    SafeReadonly<Partial<Record<TKeyValue, TItem>>> | undefined
  >;
  mergeFilterIncoming?: (
    incoming: readonly TItem[],
    options: FieldFunctionOptions
  ) => readonly TItem[] | undefined;
}

/**
 * Creates a field policy which translates an array with unique keyed items
 * into a map by the key.
 */
export function fieldArrayToMap<
  TKeyName extends string,
  TKeyValue extends string,
  TItem extends Record<TKeyName, TKeyValue> | Reference,
>(
  keyName: TKeyName,
  rootOptions: FieldArrayToMapOptions<TKeyName, TKeyValue, TItem> = {}
): FieldPolicy<Partial<Record<TKeyValue, TItem>>, TItem[]> {
  const { argName = keyName, keyArgs = false } = rootOptions;
  return {
    keyArgs,
    read(existing, options) {
      const { args } = options;

      existing = rootOptions.read?.(existing, options) ?? existing;

      if (!existing) return;

      const key = args?.[argName] as TKeyValue | undefined;
      if (!key) return Object.values(existing) as TItem[];
      const entry = existing[key] as TItem | undefined;
      if (!entry) return;
      return [entry];
    },
    merge(existing, incoming, options) {
      const { mergeObjects, isReference, readField } = options;
      const merged = existing
        ? { ...existing }
        : ({} as Partial<Record<TKeyValue, TItem>>);

      incoming = rootOptions.mergeFilterIncoming?.(incoming, options) ?? incoming;

      incoming.forEach((incomingEntry) => {
        let keyValue: TKeyValue;
        if (isReference(incomingEntry)) {
          if (keyName === '__ref') {
            // Using __ref directly as unique key instead of readField(keyName, incomingEntry)
            // since readField is not guaranteed to return a value in merge fn
            keyValue = incomingEntry.__ref as TKeyValue;
          } else {
            const readKey = readField({
              from: incomingEntry,
              fieldName: keyName,
            });
            if (!readKey) return;
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            keyValue = String(readKey) as TKeyValue;
          }
        } else {
          const entry = incomingEntry as Record<TKeyName, TKeyValue>;
          keyValue = entry[keyName];
        }

        const existingEntry = merged[keyValue];
        merged[keyValue] = existingEntry
          ? mergeObjects(existingEntry, incomingEntry)
          : incomingEntry;
      });

      return merged as SafeReadonly<Partial<Record<TKeyValue, TItem>>>;
    },
  };
}
