import { useQuery } from '@apollo/client';
import { Box, BoxProps } from '@mui/material';
import { ComponentType } from 'react';

import { gql } from '../../__generated__';
import { CollabInputQueryQuery, NoteTextFieldName } from '../../__generated__/graphql';

import { useUserId } from '../../user/context/user-id';
import { LoggerProvider, useLogger } from '../../utils/context/logger';
import { useNoteId } from '../context/note-id';
import { NoteTextFieldNameProvider } from '../context/note-text-field-name';

import { useCollabHtmlInput } from '../hooks/useCollabHtmlInput';

import { CollabInputUsersEditingCarets } from './CollabInputUsersEditingCarets';
import { SubmitSelectionChangeDebounced } from './SubmitSelectionChangeDebounced';

const _CollabInput_NoteFragment = gql(`
  fragment CollabInput_NoteFragment on Note {
    ...CollabInputUsersEditingCarets_NoteFragment
  }
`);

const CollabInput_Query = gql(`
  query CollabInput_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $fieldName: NoteTextFieldName!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        collabService
        textField(name: $fieldName) {
          editor
        }
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
  'noteLink'
>) {
  const logger = useLogger('CollabInput');

  const userId = useUserId();
  const noteId = useNoteId();

  const { data } = useQuery(CollabInput_Query, {
    variables: {
      userBy: {
        id: userId,
      },
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
        <NoteDefined<TInputProps> {...restProps} noteLink={data.signedInUser.noteLink} />
      </LoggerProvider>
    </NoteTextFieldNameProvider>
  );
}

type CollabHtmlInputProps = ReturnType<typeof useCollabHtmlInput>;

function NoteDefined<TInputProps>({
  noteLink,
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
  noteLink: CollabInputQueryQuery['signedInUser']['noteLink'];
}) {
  const collabHtmlInput = useCollabHtmlInput(
    noteLink.textField.editor,
    noteLink.collabService
  );

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
