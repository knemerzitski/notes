import { Reference, FieldPolicy } from '@apollo/client';
import { activeNotesVar } from '../../reactive-vars';

export const allActiveNotes: FieldPolicy<Reference[], Reference[]> = {
  read() {
    return Object.values(activeNotesVar());
  },
};
