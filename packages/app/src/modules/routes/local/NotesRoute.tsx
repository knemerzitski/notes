import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../../router/hooks/useAbsoluteLocation';
import { gql } from '../../../__generated__/gql';
import usePauseableQuery from '../../apollo-client/hooks/usePauseableQuery';
import { NoteItemProps } from '../../note/components/NoteItem';
import { NoteTextField } from '../../../__generated__/graphql';
import { useIsBackgroundLocation } from '../../router/hooks/useIsBackgroundLocation';
import WidgetListFabLayout from '../../note/components/WidgetListFabLayout';
import { CollabEditor } from '~collab/client/collab-editor';
import useCreateLocalNote from '../../note-local/hooks/useCreateLocalNote';
import { useRef, useState } from 'react';
import { insertLocalNoteToNotesConnection } from '../../note-local/policies/Query/localNotesConnection';
import { useApolloClient } from '@apollo/client';
import { newEmptyEditors } from '../../note/hooks/useCreatableNoteTextFieldEditors';
import { editorsInCache } from '../../editor/editors';
import useDeleteLocalNote from '../../note-local/hooks/useDeleteLocalNote';
import { Button } from '@mui/material';

const QUERY = gql(`
  query LocalNotesRoute($last: NonNegativeInt!, $before: NonNegativeInt) {
    localNotesConnection(last: $last, before: $before) @client {
      edges {
        node {
          id
          textFields {
            key
            value {
              id
              viewText
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        startCursor
      }
    }
  }
`);

interface NotesRouteProps {
  perPageCount?: number;
}

export default function NotesRoute({ perPageCount = 20 }: NotesRouteProps) {
  const apolloClient = useApolloClient();
  const isBackgroundLocation = useIsBackgroundLocation();

  const { data, fetchMore } = usePauseableQuery(isBackgroundLocation, QUERY, {
    variables: {
      last: perPageCount,
    },
    fetchPolicy: 'cache-only',
  });

  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const deleteNote = useDeleteLocalNote();
  const createNote = useCreateLocalNote();
  const [newNoteEditors, setNewNoteEditors] = useState(newEmptyEditors());
  const createdNoteRef = useRef<NonNullable<ReturnType<typeof createNote>> | null>();

  const notes: NoteItemProps['note'][] =
    data?.localNotesConnection.edges.map(({ node: { id, textFields } }) => {
      const title =
        textFields.find(({ key }) => key === NoteTextField.Title)?.value.viewText ?? '';
      const content =
        textFields.find(({ key }) => key === NoteTextField.Content)?.value.viewText ?? '';

      return {
        id: String(id),
        title: title,
        content: content,
        editing: absoluteLocation.pathname === transform(`/local/note/${id}`),
      };
    }) ?? [];

  notes.reverse();

  const pageInfo = data?.localNotesConnection.pageInfo;

  function handleFabCreate() {
    const newNote = createNote();
    insertLocalNoteToNotesConnection(apolloClient.cache, newNote);

    navigate(`/local/note/${newNote.id}`, {
      state: {
        autoFocus: true,
      },
    });
  }

  function handleStartEdit(noteId: string) {
    navigate(`/local/note/${noteId}`);
  }

  async function handleDelete(id: string) {
    deleteNote(id);
    return Promise.resolve(true);
  }

  async function handleFetchMore() {
    if (!pageInfo) return;

    await fetchMore({
      variables: {
        last: perPageCount,
        before: pageInfo.startCursor,
      },
      // Merge result to existing
      updateQuery(previousResult, { fetchMoreResult }) {
        return {
          localNotesConnection: {
            ...fetchMoreResult.localNotesConnection,
            edges: [
              ...fetchMoreResult.localNotesConnection.edges,
              ...previousResult.localNotesConnection.edges,
            ],
            pageInfo: fetchMoreResult.localNotesConnection.pageInfo,
          },
        };
      },
    });
  }

  function handleCreateNote() {
    const newNote = createNote();

    // Add editors to cache
    newNote.textFields.forEach(({ key, value }) => {
      const editor = newNoteEditors.find((entry) => entry.key === key)?.value;
      editorsInCache.set(
        {
          __typename: value.__typename,
          id: String(value.id),
        },
        editor ?? new CollabEditor()
      );
    });

    if (createdNoteRef.current) {
      insertLocalNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = newNote;
  }

  function handleCloseCreateNoteWidget() {
    setNewNoteEditors(newEmptyEditors());
    if (createdNoteRef.current) {
      insertLocalNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = null;
  }

  return (
    <>
      <WidgetListFabLayout
        createNoteWidgetEditor={{
          editors: newNoteEditors,
        }}
        createNoteWidget={{
          initialContentInputProps: {
            inputProps: {
              placeholder: 'Take a local note...',
            },
          },
          onCreate: handleCreateNote,
          onClose: handleCloseCreateNoteWidget,
        }}
        notesList={{
          notes,
          onStartEdit: handleStartEdit,
          onDelete: handleDelete,
        }}
        createNoteFab={{
          onCreate: handleFabCreate,
        }}
      />
      {pageInfo?.hasPreviousPage && (
        <Button onClick={() => void handleFetchMore()}>Fetch More</Button>
      )}
    </>
  );
}
