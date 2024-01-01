import { TypePolicies } from '@apollo/client';
import { GraphQLError } from 'graphql';

import {
  CreateNoteInput,
  CreateNotePayload,
  DeleteNoteInput,
  DeleteNotePayload,
  UpdateNoteInput,
  UpdateNotePayload,
  UserNote,
} from '../__generated__/graphql';

import { deleteNote, readNextNoteId, readNote, readNotes, saveNote } from './persistence';

const typePolicies: TypePolicies = {
  Query: {
    fields: {
      localNotes: {
        read() {
          return readNotes();
        },
      },
      localNote: {
        read(_, { variables }: { variables?: { id?: string } }) {
          const id = variables?.id;
          if (!id) return null;
          return readNote(id);
        },
      },
    },
  },
  Mutation: {
    fields: {
      createLocalNote: {
        read(
          _,
          { variables }: { variables?: { input?: CreateNoteInput } }
        ): CreateNotePayload {
          if (!variables?.input?.newNote) {
            throw new GraphQLError('Missing input');
          }

          const { title, textContent } = variables.input.newNote;

          const id = readNextNoteId();
          const note: UserNote = {
            id,
            note: {
              id,
              title: title ?? '',
              textContent: textContent ?? '',
            },
            preferences: {},
          };

          saveNote(note);

          return {
            note,
          };
        },
      },
      updateLocalNote: {
        read(
          _,
          { variables }: { variables?: { input?: UpdateNoteInput } }
        ): UpdateNotePayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }

          const id = variables.input.id;
          const existingNote = readNote(id);
          if (!existingNote) {
            throw new GraphQLError('Note not found');
          }

          if (!variables.input.patch) {
            return {
              note: existingNote,
            };
          }

          const patch = variables.input.patch;
          if (patch.note) {
            if (patch.note.title) {
              existingNote.note.title = patch.note.title;
            }
            if (patch.note.textContent) {
              existingNote.note.textContent = patch.note.textContent;
            }
          }
          if (patch.preferences?.backgroundColor) {
            existingNote.preferences.backgroundColor = patch.preferences
              .backgroundColor as string;
          }

          saveNote(existingNote);

          return {
            note: existingNote,
          };
        },
      },
      deleteLocalNote: {
        read(
          _,
          { variables }: { variables?: { input?: DeleteNoteInput } }
        ): DeleteNotePayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }

          const id = variables.input.id;

          deleteNote(id);

          return {
            deleted: true,
          };
        },
      },
    },
  },
};

export default typePolicies;
