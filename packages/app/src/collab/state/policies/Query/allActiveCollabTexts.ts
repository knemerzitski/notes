import { Reference, FieldPolicy } from '@apollo/client';
import { activeCollabTextsVar } from '../../reactive-vars';

export const allActiveCollabTexts: FieldPolicy<Reference[], Reference[]> = {
  read() {
    return Object.values(activeCollabTextsVar());
  },
};
