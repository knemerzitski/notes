import { FieldPolicy, Reference } from '@apollo/client';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';

export interface FieldArrayToMapOptions<
  TKey extends string,
  TValue extends string,
  TEntry extends { [Key in TKey]: TValue } | Reference,
> {
  argName?: string;
  defaultRead?: Partial<Record<TValue, TEntry>>;
}

// TODO test
/**
 * Creates a field policy which translates an array with unique keyed items
 * into a map by the key.
 */
export function fieldArrayToMap<
  TKey extends string,
  TValue extends string,
  TEntry extends { [Key in TKey]: TValue } | Reference,
>(
  keyName: TKey,
  options: FieldArrayToMapOptions<TKey, TValue, TEntry> = {}
): FieldPolicy<Partial<Record<TValue, TEntry>>, TEntry[]> {
  const { argName = keyName, defaultRead } = options;
  return {
    keyArgs: false,
    read(existing = defaultRead, { args }) {
      if (!existing) return;

      const key = args?.[argName] as TValue | undefined;
      if (!key) return Object.values(existing) as TEntry[];
      const entry = existing[key] as TEntry | undefined;
      if (!entry) return;
      return [entry];
    },
    merge(existing, incoming, { mergeObjects, isReference, readField }) {
      const merged = existing ? { ...existing } : ({} as Partial<Record<TValue, TEntry>>);
      incoming.forEach((incomingEntry) => {
        let keyValue: TValue;
        if (isReference(incomingEntry)) {
          const readKey = readField({
            from: incomingEntry,
            fieldName: keyName,
          });
          if (!readKey) return;
          keyValue = String(readKey) as TValue;
        } else {
          const entry = incomingEntry as { [Key in TKey]: TValue };
          keyValue = entry[keyName];
        }

        const existingEntry = merged[keyValue];
        merged[keyValue] = existingEntry
          ? mergeObjects(existingEntry, incomingEntry)
          : incomingEntry;
      });

      return merged as SafeReadonly<Partial<Record<TValue, TEntry>>>;
    },
  };
}
