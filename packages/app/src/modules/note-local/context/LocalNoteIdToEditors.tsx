import { ReactNode, createContext, useContext, useMemo } from 'react';
import { gql } from '../../../__generated__/gql';
import { useQuery } from '@apollo/client';
import NoteTextFieldEditorsProvider from '../../note/context/NoteTextFieldEditorsProvider';
import { editorsInCache } from '../../editor/editors';
import { NoteTextField, NoteTextFieldEntry } from '../../../__generated__/graphql';
import { CollabEditor } from '~collab/client/collab-editor';
import LocalNoteIdProvider from './LocalNoteIdProvider';

const QUERY = gql(`
  query LocalNoteIdToTextFieldEditorsProvider($localNoteId: ID!) {
    localNote(id: $localNoteId) @client {
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

export type LocalNoteCollabTexts = (Omit<NoteTextFieldEntry, 'value'> & {
  value: {
    id: string;
    editor: CollabEditor;
  };
})[];

const LocalNoteCollabTextContext = createContext<LocalNoteCollabTexts | null>(null);

export function useLocalNoteCollabTexts() {
  const ctx = useContext(LocalNoteCollabTextContext);
  if (ctx === null) {
    throw new Error(
      'useLocalNoteCollabTexts() requires context <LocalNoteIdToCollabTextsProvider>'
    );
  }
  return ctx;
}

export function useNoteCollabText(fieldName: NoteTextField) {
  const collabTexts = useLocalNoteCollabTexts();

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

interface LocalNoteIdToCollabTextsProviderProps {
  localNoteId: string;
  children: ReactNode;
}

export default function LocalNoteIdToCollabTextsProvider({
  localNoteId,
  children,
}: LocalNoteIdToCollabTextsProviderProps) {
  const { data } = useQuery(QUERY, {
    variables: {
      localNoteId,
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
    <LocalNoteIdProvider localNoteId={localNoteId}>
      <LocalNoteCollabTextContext.Provider value={collabTexts}>
        <NoteTextFieldEditorsProvider editors={editors}>
          {children}
        </NoteTextFieldEditorsProvider>
      </LocalNoteCollabTextContext.Provider>
    </LocalNoteIdProvider>
  );
}
