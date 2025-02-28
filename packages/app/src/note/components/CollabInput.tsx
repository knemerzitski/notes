import { useQuery } from '@apollo/client';
import { Box, BoxProps } from '@mui/material';
import { ComponentType } from 'react';

import { gql } from '../../__generated__';
import { CollabInputQueryQuery, NoteTextFieldName } from '../../__generated__/graphql';

import { LoggerProvider, useLogger } from '../../utils/context/logger';
import { useNoteId } from '../context/note-id';
import { NoteTextFieldNameProvider } from '../context/note-text-field-name';

import { useCollabHtmlInput } from '../hooks/useCollabHtmlInput';

import { CollabInputUsersEditingCarets } from './CollabInputUsersEditingCarets';
import { SubmitSelectionChangeDebounced } from './SubmitSelectionChangeDebounced';

const CollabInput_Query = gql(`
  query CollabInput_Query($noteBy: NoteByInput!, $fieldName: NoteTextFieldName!) {
    note(by: $noteBy) {
      id
      collabService
      textField(name: $fieldName) {
        editor
      }
    }
  }
`);

export type CollabInputProps<TInputProps> = Parameters<
  typeof CollabInput<TInputProps>
>[0];

export function CollabInput<TInputProps>({
  fieldName,
  ...restProps
}: { fieldName: NoteTextFieldName } & Omit<
  Parameters<typeof NoteDefined<TInputProps>>[0],
  'note'
>) {
  const logger = useLogger('CollabInput');

  const noteId = useNoteId();

  const { data } = useQuery(CollabInput_Query, {
    variables: {
      noteBy: {
        id: noteId,
      },
      fieldName,
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  return (
    <NoteTextFieldNameProvider textFieldName={fieldName}>
      <LoggerProvider logger={logger?.extend(fieldName)}>
        <NoteDefined<TInputProps> {...restProps} note={data.note} />
      </LoggerProvider>
    </NoteTextFieldNameProvider>
  );
}

type CollabHtmlInputProps = ReturnType<typeof useCollabHtmlInput>;

function NoteDefined<TInputProps>({
  note,
  slots,
  slotProps,
}: {
  slots: {
    root?: ComponentType<BoxProps>;
    input: ComponentType<TInputProps>;
  };
  slotProps?: {
    root?: Omit<BoxProps, 'position'>;
    input?: Omit<TInputProps, keyof CollabHtmlInputProps>;
  };
  note: CollabInputQueryQuery['note'];
}) {
  const collabHtmlInput = useCollabHtmlInput(note.textField.editor, note.collabService);

  const InputSlot = slots.input;
  const RootSlot = slots.root ?? Box;

  return (
    <>
      <SubmitSelectionChangeDebounced inputRef={collabHtmlInput.inputRef} />
      <RootSlot {...slotProps?.root} position="relative">
        {/* @ts-expect-error Safe to spread props in normal use */}
        <InputSlot {...slotProps?.input} {...collabHtmlInput} />
        {/* Uses inputRef to render caret in correct position */}
        <CollabInputUsersEditingCarets inputRef={collabHtmlInput.inputRef} />
      </RootSlot>
    </>
  );
}
