import { useQuery } from '@apollo/client';
import { ReactNode, createContext, useContext, useMemo } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';

import { gql } from '../../../../__generated__/gql';
import { NoteTextField, NoteTextFieldEntry } from '../../../../__generated__/graphql';
import { editorsInCache } from '../../../editor/editors';
import NoteTextFieldEditorsProvider from '../../remote/context/NoteTextFieldEditorsProvider';

import NoteIdProvider from './NoteIdProvider';

const QUERY = gql(`
  query LocalNoteIdToTextFieldEditorsProvider($noteId: ID!) {
    localNote(id: $noteId) @client {
      id
      textFields {
        key
        value {
          id
        }
      }
    }
  }
`);

export type NoteCollabTexts = (Omit<NoteTextFieldEntry, 'value'> & {
  value: {
    id: string;
    editor: CollabEditor;
  };
})[];

const NoteCollabTextContext = createContext<NoteCollabTexts | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNoteCollabTexts() {
  const ctx = useContext(NoteCollabTextContext);
  if (ctx === null) {
    throw new Error(
      'useNoteCollabTexts() requires context <NoteIdToCollabTextsProvider>'
    );
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNoteCollabText(fieldName: NoteTextField) {
  const collabTexts = useNoteCollabTexts();

  const collabText = collabTexts.find((entry) => entry.key === fieldName);
  if (!collabText) {
    throw new Error(`LocalNote text field ${fieldName} not found`);
  }

  return collabText;
}

function getCacheId(id: string) {
  return {
    __typename: 'LocalCollabText',
    id,
  };
}

interface NoteIdToCollabTextsProviderProps {
  noteId: string;
  children: ReactNode;
}

export default function NoteIdToCollabTextsProvider({
  noteId: noteId,
  children,
}: NoteIdToCollabTextsProviderProps) {
  const { data } = useQuery(QUERY, {
    variables: {
      noteId,
    },
  });

  const collabTexts = useMemo(
    () =>
      data?.localNote.textFields.map(({ key, value }) => ({
        key,
        value: {
          id: String(value.id),
          editor: editorsInCache.getOrCreate(getCacheId(String(value.id))).editor,
        },
      })),
    [data]
  );

  const editors = useMemo(
    () => collabTexts?.map(({ key, value }) => ({ key, value: value.editor })),
    [collabTexts]
  );

  if (!collabTexts || !editors) {
    return null;
  }

  return (
    <NoteIdProvider noteId={noteId}>
      <NoteCollabTextContext.Provider value={collabTexts}>
        <NoteTextFieldEditorsProvider editors={editors}>
          {children}
        </NoteTextFieldEditorsProvider>
      </NoteCollabTextContext.Provider>
    </NoteIdProvider>
  );
}
