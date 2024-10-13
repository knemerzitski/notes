import {
  FieldFunctionOptions,
  FieldPolicy,
  FieldReadFunction,
  Reference,
} from '@apollo/client';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';

export interface FieldArrayToMapOptions<
  TKeyName extends string,
  TKeyValue extends string,
  TItem extends { [Key in TKeyName]: TKeyValue } | Reference,
> {
  argName?: string;
  read?: FieldReadFunction<
    Partial<Record<TKeyValue, TItem>>,
    SafeReadonly<Partial<Record<TKeyValue, TItem>>> | undefined
  >;
  mergeFilterIncoming?: (
    incoming: readonly TItem[],
    options: FieldFunctionOptions
  ) => readonly TItem[] | undefined;
}

// TODO test
/**
 * Creates a field policy which translates an array with unique keyed items
 * into a map by the key.
 */
export function fieldArrayToMap<
  TKeyName extends string,
  TKeyValue extends string,
  TItem extends { [Key in TKeyName]: TKeyValue } | Reference,
>(
  keyName: TKeyName,
  rootOptions: FieldArrayToMapOptions<TKeyName, TKeyValue, TItem> = {}
): FieldPolicy<Partial<Record<TKeyValue, TItem>>, TItem[]> {
  const { argName = keyName } = rootOptions;
  return {
    keyArgs: false,
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
          const readKey = readField({
            from: incomingEntry,
            fieldName: keyName,
          });
          if (!readKey) return;
          keyValue = String(readKey) as TKeyValue;
        } else {
          const entry = incomingEntry as { [Key in TKeyName]: TKeyValue };
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
