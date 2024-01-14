import { TypePolicies } from '@apollo/client';
import { GraphQLError } from 'graphql';

import { LocalNote } from '../../__generated__/graphql';

import { notesVar } from './state';

const typePolicies: TypePolicies = {
  Query: {
    fields: {
      localNotes(): LocalNote[] {
        return notesVar();
      },
      localNote(_, { variables }: { variables?: { id?: string } }): LocalNote {
        const id = variables?.id;
        if (!id) {
          throw new GraphQLError('Id is required');
        }
        const notes = notesVar();

        const note = notes.find((note) => note.id === id);

        if (!note) {
          throw new GraphQLError('Note not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }
        return note;
      },
    },
  },
};

export default typePolicies;
