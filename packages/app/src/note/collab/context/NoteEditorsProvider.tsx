import { ApolloClient, useApolloClient } from '@apollo/client';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

import { Changeset } from '~collab/changeset/changeset';
import { CollabEditor } from '~collab/client/collab-editor';
import createDeferred, { Deferred } from '~utils/deferred';
import { Entry } from '~utils/types';

import { gql } from '../../../__generated__/gql';
import { NoteTextField } from '../../../__generated__/graphql';

import { useActiveNotes } from './ActiveNotesProvider';
import { useNoteId } from './NoteIdProvider';

export const QUERY = gql(`
  query NoteEditorsProviderCreateEditor($id: String!) {
    note(contentId: $id) {
      id
      textFields {
        key
        value {
          id
          headText {
            changeset
            revision
          }
        }
      }
    }
  }
`);

interface DeferredState<T> extends PromiseState<T> {
  deferred: Deferred<T>;
}

interface PromiseState<T> {
  status: 'pending' | 'success' | 'error';
  promise: Promise<T>;
  result?: T;
  error?: unknown;
}

export type TextFieldEditors = Entry<NoteTextField, CollabEditor>[];

type GetEditorsContextProp = (noteId: string) => PromiseState<TextFieldEditors>;

const GetEditorsContext = createContext<GetEditorsContextProp | null>(null);

interface NoteEditorsProviderProps {
  children: ReactNode;
}

export default function NoteEditorsProvider({ children }: NoteEditorsProviderProps) {
  const activeNoteIds = useActiveNotes();

  const editorsStatesRef = useRef<Record<string, DeferredState<TextFieldEditors>>>({});

  const getOrCreateState = useCallback((noteId: string) => {
    let existingState = editorsStatesRef.current[noteId];
    if (!existingState) {
      const deferred = createDeferred<TextFieldEditors>();
      const newState: DeferredState<TextFieldEditors> = {
        status: 'pending',
        deferred,
        promise: deferred.promise,
      };
      newState.deferred.promise
        .then((editor) => {
          newState.result = editor;
          newState.status = 'success';
        })
        .catch((err) => {
          newState.error = err;
          newState.status = 'error';
        });
      existingState = newState;
      editorsStatesRef.current[noteId] = newState;
    }
    return existingState;
  }, []);

  function deleteState(noteId: string) {
    // existing promise must throw...
    const state = editorsStatesRef.current[noteId];
    if (!state) return;

    state.deferred.reject(new Error('Note editor deleted'));

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete editorsStatesRef.current[noteId];
  }

  return (
    <GetEditorsContext.Provider value={getOrCreateState}>
      {activeNoteIds.map((noteId) => (
        <CreateNoteEditors
          key={noteId}
          noteId={noteId}
          onCreated={(editors) => {
            getOrCreateState(noteId).deferred.resolve(editors);
          }}
          onError={(err) => {
            getOrCreateState(noteId).deferred.reject(err);
          }}
          onDelete={() => {
            deleteState(noteId);
          }}
        />
      ))}
      {children}
    </GetEditorsContext.Provider>
  );
}

interface CreateNoteEditorsProps {
  noteId: string;
  onCreated: (editors: TextFieldEditors) => void;
  onDelete?: () => void;
  onError?: (error: unknown) => void;
}

function CreateNoteEditors({
  noteId,
  onCreated,
  onDelete,
  onError,
}: CreateNoteEditorsProps) {
  const client = useApolloClient();

  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    void createEditors({
      client,
      noteId,
    })
      .then((editor) => {
        onCreatedRef.current(editor);
      })
      .catch((err) => {
        onErrorRef.current?.(err);
      });

    return onDeleteRef.current?.();
  }, [client, noteId]);

  return null;
}

interface CreateEditorsOptions<T> {
  client: ApolloClient<T>;
  noteId: string;
}

async function createEditors<T>({ client, noteId }: CreateEditorsOptions<T>) {
  const { data } = await client.query({
    query: QUERY,
    variables: {
      id: noteId,
    },
  });

  return data.note.textFields.map(({ key, value }) => {
    return {
      key,
      value: CollabEditor.newFromHeadText({
        revision: value.headText.revision,
        changeset: Changeset.parseValue(value.headText.changeset),
      }),
    };
  });
}

/**
 * Note must be added to active notes list by using hook useModifyActiveNotes or
 * suspense will hang.
 */
export function useSuspenseNoteEditors(): TextFieldEditors {
  const noteId = useNoteId();

  const getEditorsState = useContext(GetEditorsContext);

  if (getEditorsState === null) {
    throw new Error('useSuspenseNoteEditors() requires context <NoteEditorsProvider>');
  }

  const state = getEditorsState(noteId);

  if (state.status === 'pending') {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw state.promise;
  } else if (state.status === 'error') {
    throw state.error;
  } else if (!state.result) {
    throw new Error('Expected useSuspenseNoteEditors promise result to be defined');
  }

  return state.result;
}

/**
 * Note must be added to active notes list by using hook useModifyActiveNotes or
 * suspense will hang.
 */
export function useSuspenseNoteEditor(field: NoteTextField): CollabEditor {
  const editors = useSuspenseNoteEditors();

  const editor = editors.find(({ key }) => key === field);
  if (!editor) {
    throw new Error(`Expected useNoteEditor to have field ${field}`);
  }

  return editor.value;
}
