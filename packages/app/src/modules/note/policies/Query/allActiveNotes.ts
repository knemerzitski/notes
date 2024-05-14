import { Reference, FieldPolicy } from '@apollo/client';
import { activeNotesVar } from '../../active-notes';

export const allActiveNotes: FieldPolicy<Reference[], Reference[]> = {
  read() {
    return Object.values(activeNotesVar());
  },
};
