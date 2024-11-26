import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useCollabHtmlInput } from '../hooks/useCollabHtmlInput';
import { CollabInputQueryQuery, NoteTextFieldName } from '../../__generated__/graphql';
import { ComponentType } from 'react';

const CollabInput_Query = gql(`
  query CollabInput_Query($id: ObjectID!, $fieldName: NoteTextFieldName!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        collabService
        textField(name: $fieldName) {
          editor
        }
      }
    }
  }
`);

export function CollabInput<TInputProps>({
  fieldName,
  ...restProps
}: { fieldName: NoteTextFieldName } & Omit<
  Parameters<typeof NoteDefined<TInputProps>>[0],
  'note'
>) {
  const noteId = useNoteId();

  const { data } = useQuery(CollabInput_Query, {
    variables: {
      id: noteId,
      fieldName,
    },
  });

  if (!data) {
    return null;
  }

  return <NoteDefined<TInputProps> {...restProps} note={data.userNoteLink.note} />;
}

type CollabHtmlInputProps = ReturnType<typeof useCollabHtmlInput>;

function NoteDefined<TInputProps>({
  note,
  Input,
  InputProps,
}: {
  Input: ComponentType<TInputProps>;
  InputProps?: Omit<TInputProps, keyof CollabHtmlInputProps>;
  note: CollabInputQueryQuery['userNoteLink']['note'];
}) {
  const collabHtmlInput = useCollabHtmlInput(note.textField.editor, note.collabService);

  //@ts-expect-error Safe to spread props in normal use
  return <Input {...InputProps} {...collabHtmlInput} />;
}
