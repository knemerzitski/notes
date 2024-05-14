import { FieldPolicy } from '@apollo/client';
import { Note } from '../../../../__generated__/graphql';

export const isOwner: FieldPolicy<Note['isOwner'], Note['isOwner']> = {
  read(existing = true) {
    return existing;
  },
};
