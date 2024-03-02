import { TypePolicies } from '@apollo/client';
import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { LocalNote } from '../../__generated__/graphql';

import { notesVar } from './state';


const notePolicies: TypePolicies = {
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
              code: GraphQLErrorCode.NotFound,
            },
          });
        }
        return note;
      },
    },
  },
};

export default notePolicies;
