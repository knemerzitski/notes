import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { NoteTextFieldName } from '../types';

const TextFieldNameContext = createContext<NoteTextFieldName | null>(null);

export function useNoteTextFieldName(nullable: true): Maybe<NoteTextFieldName>;
export function useNoteTextFieldName(nullable?: false): NoteTextFieldName;
export function useNoteTextFieldName(nullable?: boolean): Maybe<NoteTextFieldName> {
  const ctx = useContext(TextFieldNameContext);
  if (ctx === null && !nullable) {
    throw new Error(
      'useNoteTextFieldName() requires context <NoteTextFieldNameProvider>'
    );
  }
  return ctx;
}

export function NoteTextFieldNameProvider({
  textFieldName,
  children,
}: {
  textFieldName: NoteTextFieldName;
  children: ReactNode;
}) {
  return (
    <TextFieldNameContext.Provider value={textFieldName}>
      {children}
    </TextFieldNameContext.Provider>
  );
}
