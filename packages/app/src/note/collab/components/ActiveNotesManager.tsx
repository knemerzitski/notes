import { useFragment } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import SubmittedRecordMutation from './SubmittedRecordMutation';
import ExternalChangesSubscription from './ExternalChangesSubscription';

const FRAGMENT = gql(`
  fragment ActiveNotesManager on AllNotes {
    active {
      contentId
      isOwner
      textFields {
        key
        value {
          id
        }
      }
    }
  }
`);

export default function ActiveNotesManager() {
  const allNotes = useFragment({
    from: {
      __typename: 'AllNotes',
    },
    fragment: FRAGMENT,
  });

  if (!allNotes.complete) return null;

  return (
    <>
      <ExternalChangesSubscription />

      {allNotes.data.active.map((activeNote) => {
        const noteContentId = activeNote.contentId;

        return (
          <>
            {!activeNote.isOwner && (
              <ExternalChangesSubscription
                key={noteContentId}
                noteContentId={noteContentId}
              />
            )}

            {activeNote.textFields.map((textField) => {
              const fieldName = textField.key;
              const collabTextId = String(textField.value.id);

              return (
                <>
                  <SubmittedRecordMutation
                    key={collabTextId}
                    noteContentId={noteContentId}
                    noteField={fieldName}
                    collabTextId={collabTextId}
                  />
                </>
              );
            })}
          </>
        );
      })}
    </>
  );
}
