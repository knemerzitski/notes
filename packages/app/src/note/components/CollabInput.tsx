import { useQuery } from '@apollo/client';
import { Box } from '@mui/material';
import { ComponentType } from 'react';

import { gql } from '../../__generated__';
import { CollabInputQueryQuery, NoteTextFieldName } from '../../__generated__/graphql';

import { useNoteId } from '../context/note-id';
import { NoteTextFieldNameProvider } from '../context/note-text-field-name';

import { useCollabHtmlInput } from '../hooks/useCollabHtmlInput';

import { CollabInputUsersEditingCarets } from './CollabInputUsersEditingCarets';
import { SubmitSelectionChangeDebounced } from './SubmitSelectionChangeDebounced';

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

  return (
    <NoteTextFieldNameProvider textFieldName={fieldName}>
      <NoteDefined<TInputProps> {...restProps} note={data.userNoteLink.note} />
    </NoteTextFieldNameProvider>
  );
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
  const inputRef = collabHtmlInput.inputRef;

  return (
    <>
      <SubmitSelectionChangeDebounced />
      <Box position="relative">
        {/* @ts-expect-error Safe to spread props in normal use */}
        <Input {...InputProps} {...collabHtmlInput} />
        {/* Uses inputRef to render caret in correct position */}
        <CollabInputUsersEditingCarets inputRef={inputRef} />
      </Box>
    </>
  );
}
