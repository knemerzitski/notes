import { WatchQueryFetchPolicy, useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { ReactNode, createContext, useContext, useMemo } from 'react';
import { getCollabEditor } from '../../collab/hooks/useCollabEditor';
import NoteContentIdProvider from './NoteContentIdProvider';
import NoteTextFieldEditorsProvider from './NoteTextFieldEditorsProvider';
import { CollabEditor } from '~collab/client/collab-editor';
import { NoteTextField, NoteTextFieldEntry } from '../../../__generated__/graphql';

const QUERY = gql(`
  query NoteContentIdToEditorsProvider($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      textFields {
        key
        value {
          id
          headText {
            revision
            changeset
          }
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

export function useNoteCollabTexts() {
  const ctx = useContext(NoteCollabTextContext);
  if (ctx === null) {
    throw new Error('useNoteCollabTexts() requires context <NoteContentIdToCollabTextsProvider>');
  }
  return ctx;
}

export function useNoteCollabText(fieldName: NoteTextField) {
  const collabTexts = useNoteCollabTexts();

  const collabText = collabTexts.find((entry) => entry.key === fieldName);
  if (!collabText) {
    throw new Error(`Note text field ${fieldName} not found`);
  }

  return collabText;
}

interface NoteContentIdToCollabTextsProviderProps {
  noteContentId: string;
  fetchPolicy?: WatchQueryFetchPolicy;
  children: ReactNode;
}

export default function NoteContentIdToCollabTextsProvider({
  noteContentId,
  fetchPolicy = 'cache-only',
  children,
}: NoteContentIdToCollabTextsProviderProps) {
  const apolloClient = useApolloClient();

  const { data } = useQuery(QUERY, {
    variables: {
      noteContentId,
    },
    fetchPolicy,
  });

  const collabTexts = useMemo(
    () =>
      data?.note.textFields.map(({ key, value }) => ({
        key,
        value: {
          id: String(value.id),
          editor: getCollabEditor(apolloClient, String(value.id)),
        },
      })),
    [data, apolloClient]
  );

  const editors = useMemo(
    () => collabTexts?.map(({ key, value }) => ({ key, value: value.editor })),
    [collabTexts]
  );

  if (!collabTexts || !editors) {
    return null;
  }

  return (
    <NoteContentIdProvider noteContentId={noteContentId}>
      <NoteCollabTextContext.Provider value={collabTexts}>
        <NoteTextFieldEditorsProvider editors={editors}>
          {children}
        </NoteTextFieldEditorsProvider>
      </NoteCollabTextContext.Provider>
    </NoteContentIdProvider>
  );
}
