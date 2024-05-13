import { Reference, FieldPolicy } from '@apollo/client';
import { gql } from '../../../../__generated__';
import isDefined from '~utils/type-guards/isDefined';
import { activeNotesVar } from '../../../../note/state/active-notes';

const FRAGMENT = gql(`
  fragment AllActiveCollabTextsNote on Note {
    textFields {
      value {
        id
      }
    }
  }
`);

export const allActiveCollabTexts: FieldPolicy<Reference[], Reference[]> = {
  read(_existing, { cache, toReference }) {
    // Extract CollabTexts from active notes
    return Object.values(activeNotesVar()).flatMap((noteId) => {
      const note = cache.readFragment({
        id: noteId.__ref,
        fragment: FRAGMENT,
      });
      return (
        note?.textFields
          .map((textField) =>
            toReference({
              id: String(textField.value.id),
              __typename: 'CollabText',
            })
          )
          .filter(isDefined) ?? []
      );
    });
  },
};
