import { FieldPolicy } from '@apollo/client';
import { Note, NoteTextFieldEntry } from '../../../../__generated__/graphql';

export const textFields: FieldPolicy<Note['textFields'], Note['textFields']> = {
  merge(existing, incoming) {
    if (!existing) {
      return incoming;
    }

    // Overwrite existing with incoming by the same key
    const mergedResult: NoteTextFieldEntry[] = [...existing];
    incoming.forEach((entry) => {
      const sameKeyIndex = existing.findIndex(({ key }) => key === entry.key);
      if (sameKeyIndex !== -1) {
        mergedResult[sameKeyIndex] = entry;
      } else {
        mergedResult.push(entry);
      }
    });

    return incoming;
  },
};
