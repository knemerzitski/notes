import { TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

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
      title: {
        merge: true,
      },
      content: {
        merge: true,
      },
    },
  },
};

export default notePolicies;
