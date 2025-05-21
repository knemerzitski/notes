import { Box, BoxProps } from '@mui/material';
import { ComponentType, Suspense } from 'react';

import { gql } from '../../__generated__';

import { LoggerProvider, useLogger } from '../../utils/context/logger';
import {
  NoteTextFieldNameProvider,
  useNoteTextFieldName,
} from '../context/note-text-field-name';

import { useCacheViewTextFieldValue } from '../hooks/useCacheViewTextFieldValue';
import { useCollabFacade } from '../hooks/useCollabFacade';
import { useCollabHtmlInput } from '../hooks/useCollabHtmlInput';

import { NoteTextFieldName } from '../types';

import { CollabInputUsersEditingCarets } from './CollabInputUsersEditingCarets';
import { SubmitSelectionChangeDebounced } from './SubmitSelectionChangeDebounced';

const _CollabInput_NoteFragment = gql(`
  fragment CollabInput_NoteFragment on Note {
    ...CollabInputUsersEditingCarets_NoteFragment
  }
`);

interface BaseInputProps {
  disabled?: boolean;
}

export type CollabInputProps<TInputProps extends BaseInputProps> = Parameters<
  typeof CollabInput<TInputProps>
>[0];

export function CollabInput<TInputProps extends BaseInputProps>({
  fieldName,
  ...restProps
}: Parameters<typeof Loaded<TInputProps>>[0] & {
  fieldName: NoteTextFieldName;
}) {
  return (
    <NoteTextFieldNameProvider textFieldName={fieldName}>
      <Suspense fallback={<Fallback {...restProps} />}>
        <Loaded {...restProps} />
      </Suspense>
    </NoteTextFieldNameProvider>
  );
}

function Loaded<TInputProps extends BaseInputProps>({
  slots,
  slotProps,
}: {
  slots: {
    root?: ComponentType<BoxProps>;
    input: ComponentType<TInputProps>;
  };
  slotProps?: {
    root?: Omit<BoxProps, 'position'>;
    input?: Omit<TInputProps, keyof ReturnType<typeof useCollabHtmlInput>>;
  };
}) {
  const fieldName = useNoteTextFieldName();

  const logger = useLogger('CollabInput');

  const collabFacade = useCollabFacade();

  const fieldCollab = collabFacade.fieldCollab;

  const collabHtmlInput = useCollabHtmlInput(
    fieldCollab.getField(fieldName),
    fieldCollab.service
  );

  const InputSlot = slots.input;
  const RootSlot = slots.root ?? Box;

  return (
    <LoggerProvider logger={logger?.extend(fieldName)}>
      <>
        <SubmitSelectionChangeDebounced inputRef={collabHtmlInput.inputRef} />
        <RootSlot {...slotProps?.root} position="relative">
          {/* @ts-expect-error Safe to spread props in normal use */}
          <InputSlot {...slotProps?.input} {...collabHtmlInput} />
          {/* Uses inputRef to render caret in correct position */}
          <CollabInputUsersEditingCarets inputRef={collabHtmlInput.inputRef} />
        </RootSlot>
      </>
    </LoggerProvider>
  );
}

function Fallback<TInputProps extends BaseInputProps>({
  slots,
  slotProps,
}: Parameters<typeof Loaded<TInputProps>>[0]) {
  const fieldName = useNoteTextFieldName();
  const value = useCacheViewTextFieldValue(fieldName) ?? '';

  const InputSlot = slots.input;

  // @ts-expect-error Might not match correct type
  return <InputSlot {...slotProps?.input} value={value} disabled={true} />;
}
