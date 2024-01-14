import { TypePolicies, Reference } from '@apollo/client';

import { NoteConnection } from '../../__generated__/graphql';

interface CacheNoteConnection extends Omit<NoteConnection, 'notes'> {
  notes: Reference[];
}

interface StoredNoteConnection extends Omit<CacheNoteConnection, 'notes'> {
  // Store notes as ID map to avoid adding duplicates
  notes: Record<string, Reference>;
}

const typePolicies: TypePolicies = {
  Query: {
    fields: {
      notesConnection: {
        merge(
          existing: StoredNoteConnection | undefined,
          incoming: CacheNoteConnection,
          { args, readField }
        ): StoredNoteConnection {
          const forwardsPagination = args != null && ('first' in args || 'after' in args);
          const appendIncomingToEnd = forwardsPagination || !args;

          const uniqueIncomingNotes: StoredNoteConnection['notes'] = {};
          incoming.notes.forEach((note) => {
            const id = String(readField('id', note));
            if (!existing || !(id in existing.notes)) {
              uniqueIncomingNotes[id] = note;
            }
          });

          const notes: StoredNoteConnection['notes'] = appendIncomingToEnd
            ? { ...existing?.notes, ...uniqueIncomingNotes }
            : { ...uniqueIncomingNotes, ...existing?.notes };

          return {
            ...existing,
            ...incoming,
            notes,
          };
        },
        read(existing?: StoredNoteConnection): CacheNoteConnection | undefined {
          if (existing) {
            return {
              ...existing,
              notes: Object.values(existing.notes),
            };
          }
        },
      },
    },
  },
};

export default typePolicies;
