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
        /**
         * If forwards or backwards pagination args are provided, notes are pushed to beginning or end.
         * If no arguments are given then existing notes are replaced with incoming.
         */
        merge(
          existing: StoredNoteConnection | undefined,
          incoming: CacheNoteConnection,
          { args, readField }
        ): StoredNoteConnection {
          const backwardsPagination =
            args != null && ('last' in args || 'before' in args);
          const forwardsPagination = args != null && ('first' in args || 'after' in args);
          const mergeIncomingWithExisting = forwardsPagination || backwardsPagination;

          let notes: StoredNoteConnection['notes'] = {};
          if (mergeIncomingWithExisting) {
            const uniqueIncomingNotes: StoredNoteConnection['notes'] = {};
            incoming.notes.forEach((note) => {
              const id = String(readField('id', note));
              if (!existing || !(id in existing.notes)) {
                uniqueIncomingNotes[id] = note;
              }
            });
            if (forwardsPagination) {
              notes = { ...existing?.notes, ...uniqueIncomingNotes };
            } else {
              notes = { ...uniqueIncomingNotes, ...existing?.notes };
            }
          } else {
            incoming.notes.forEach((note) => {
              const id = String(readField('id', note));
              notes[id] = note;
            });
          }

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
