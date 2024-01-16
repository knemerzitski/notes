import { TypePolicies } from '@apollo/client';

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
      notesConnection: {
        keyArgs: false,
      },
    },
  },
};

export default notePolicies;
