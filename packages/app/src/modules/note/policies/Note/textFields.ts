import { FieldPolicy, Reference, StoreObject } from '@apollo/client';
import {
  Note,
  NoteTextField,
  NoteTextFieldEntry,
} from '../../../../__generated__/graphql';

export const textFields: FieldPolicy<
  Partial<Record<NoteTextField, NoteTextFieldEntry | Reference | StoreObject>>,
  Note['textFields']
> = {
  keyArgs: false,
  read(existing = {}, { args }) {
    const name = args?.name as NoteTextField | undefined;
    if (!name) return Object.values(existing) as NoteTextFieldEntry[];
    const entry = existing[name] as NoteTextFieldEntry | undefined;
    if (!entry) return;
    return [entry];
  },
  merge(existing = {}, incoming, { mergeObjects }) {
    // Store textFields in a map by key
    const merged = { ...existing };
    incoming.forEach((incomingEntry) => {
      const existingEntry = merged[incomingEntry.key];
      merged[incomingEntry.key] = existingEntry
        ? mergeObjects(existingEntry, incomingEntry)
        : incomingEntry;
    });

    return merged;
  },
};
