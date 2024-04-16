import { TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

import { NoteTextFieldEntry } from '../__generated__/graphql';

const notePolicies: TypePolicies = {
  Query: {
    fields: {
      note: {
        // Read single note from previously cached list of notes
        read(_, { args, toReference }) {
          if (typeof args?.id === 'string') {
            return toReference({
              __typename: 'Note',
              id: args.id,
            });
          }
        },
      },
      notesConnection: relayStylePagination(),
    },
  },
  Note: {
    fields: {
      textFields: {
        merge(
          existing: NoteTextFieldEntry[] | undefined,
          incoming: NoteTextFieldEntry[]
        ) {
          if (!existing) {
            return incoming;
          }

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
      },
    },
  },
  // TODO policy in collab?
  CollabText: {
    fields: {
      viewText: {
        read(existing, { readField }): string | null {
          if (typeof existing === 'string') {
            return existing;
          }

          const headText = readField('headText');
          if (typeof headText === 'string') {
            return headText;
          }

          return null;
        },
      },
    },
  },
};

export default notePolicies;
