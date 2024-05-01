import { gql } from '../../../__generated__/gql';
import SubmittedRecordWatcher, {
  SubmittedRecordWatcherProps,
} from '../../../collab/components/watch/SubmittedRecordWatcher';
import useUpdateNote from '../../hooks/useUpdateNote';
import {
  CollabTextUnprocessedRecordType,
  NoteTextField,
} from '../../../__generated__/graphql';

const FRAGMENT_UPDATE = gql(`
  fragment SubmittedRecordMutationWriteUnprocessedRecord on CollabText {
    submittedRecord {
      generatedId
    }
    unprocessedRecords {
      type
      record {
        id
        creatorUserId
        change {
          revision
          changeset
        }
        beforeSelection {
          start
          end
        }
        afterSelection {
          start
          end
        }
      }
    }
  }
`);

interface SubmittedRecordMutationProps {
  noteContentId: string;
  noteField: NoteTextField;
  collabTextId: string;
}

export default function SubmittedRecordMutation({
  noteContentId,
  noteField,
  collabTextId,
}: SubmittedRecordMutationProps) {
  const updateNote = useUpdateNote();

  const handleSubmittedRecord: SubmittedRecordWatcherProps['onNext'] = (value) => {
    if (!value.complete) return;

    const submittedRecord = value.data.submittedRecord;
    if (!submittedRecord) return;

    void updateNote({
      variables: {
        input: {
          contentId: noteContentId,
          patch: {
            textFields: [
              {
                key: noteField,
                value: {
                  insertRecord: submittedRecord,
                },
              },
            ],
          },
        },
      },
      update(cache, { data }) {
        if (!data) return;
        data.updateNote.patch?.textFields?.forEach((textField) => {
          const updatedCollabText = textField.value;
          const newRecord = updatedCollabText.newRecord;
          if (!newRecord) return;

          cache.updateFragment(
            {
              id: cache.identify({
                id: updatedCollabText.id,
                __typename: 'CollabText',
              }),
              fragment: FRAGMENT_UPDATE,
            },
            (data) => {
              return {
                submittedRecord: null,
                unprocessedRecords: [
                  ...(data?.unprocessedRecords ?? []),
                  {
                    type: CollabTextUnprocessedRecordType.SubmittedAcknowleged,
                    record: newRecord,
                  },
                ],
              };
            }
          );
        });
      },
    });
  };

  return (
    <SubmittedRecordWatcher collabTextId={collabTextId} onNext={handleSubmittedRecord} />
  );
}
