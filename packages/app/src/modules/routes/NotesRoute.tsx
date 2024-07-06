import { useApolloClient } from '@apollo/client';
import { Alert, Button } from '@mui/material';
import { startTransition, useEffect, useRef, useState } from 'react';

import { gql } from '../../__generated__/gql';
import { NoteTextField } from '../../__generated__/graphql';
import usePauseableQuery from '../apollo-client/hooks/usePauseableQuery';
import { useSnackbarError } from '../common/components/SnackbarAlertProvider';
import { addActiveNotesByContentId } from '../note/active-notes';
import ManageNoteSharingButton, {
  ManageNoteSharingButtonBase,
} from '../note/components/ManageNoteSharingButton';
import { NoteItemProps } from '../note/components/NoteItem';
import WidgetListFabLayout from '../note/components/WidgetListFabLayout';
import NoteContentIdProvider from '../note/context/NoteContentIdProvider';
import { useCreatableNoteTextFieldEditors } from '../note/hooks/useCreatableNoteTextFieldEditors';
import useDeleteNote from '../note/hooks/useDeleteNote';
import { insertNoteToNotesConnection } from '../note/policies/Query/notesConnection';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';
import { useIsBackgroundLocation } from '../router/hooks/useIsBackgroundLocation';

const QUERY_NOTES = gql(`
  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {
    notesConnection(last: $last, before: $before) {
      notes {
        id
        contentId
        isOwner
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
            viewText @client
          }
        }
        sharing {
          id
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

  const haveFetchedData = useRef(false);

  const {
    data,
    loading: fetchLoading,
    error,
    fetchMore,
  } = usePauseableQuery(isBackgroundLocation, QUERY_NOTES, {
    variables: {
      last: perPageCount,
    },
    fetchPolicy: haveFetchedData.current ? 'cache-first' : 'cache-and-network',
  });

  const loading = fetchLoading && !data;

  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const { editors, createNote, reset } = useCreatableNoteTextFieldEditors();
  const [createdNote, setCreatedNote] = useState<NonNullable<
    Awaited<ReturnType<typeof createNote>>
  > | null>();

  useEffect(() => {
    const notes = data?.notesConnection.notes;
    if (notes) {
      addActiveNotesByContentId(apolloClient.cache, data.notesConnection.notes);
    }
    // TODO return removeActiveNote with a delay?
  }, [apolloClient, data]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  haveFetchedData.current = true;

  const notes: NoteItemProps['note'][] =
    data?.notesConnection.notes.map(({ contentId, textFields, isOwner, sharing }) => {
      const title =
        textFields.find(({ key }) => key === NoteTextField.Title)?.value.viewText ?? '';
      const content =
        textFields.find(({ key }) => key === NoteTextField.Content)?.value.viewText ?? '';

      return {
        id: contentId,
        title: title,
        content: content,
        editing: absoluteLocation.pathname === transform(`/note/${contentId}`),
        type: !isOwner ? 'linked' : sharing ? 'shared' : undefined,
        slots: {
          toolbar: (
            <NoteContentIdProvider noteContentId={contentId}>
              <ManageNoteSharingButton />
            </NoteContentIdProvider>
          ),
        },
      };
    }) ?? [];

  // Notes array is ordered by newest at the end
  // Reverse to display newest first
  notes.reverse();

  const pageInfo = data?.notesConnection.pageInfo;

  function handleFabCreate() {
    startTransition(() => {
      navigate('/note', {
        state: {
          newNote: true,
          autoFocus: true,
        },
      });
    });
  }

  function handleStartEdit(noteId: string) {
    startTransition(() => {
      navigate(`/note/${noteId}`);
    });
  }

  function handleDelete(id: string) {
    void deleteNote(id).then((deleted) => {
      if (!deleted) {
        showError('Failed to delete note');
      }
    });
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
          notesConnection: {
            ...fetchMoreResult.notesConnection,
            notes: [
              ...fetchMoreResult.notesConnection.notes,
              ...previousResult.notesConnection.notes,
            ],
            pageInfo: fetchMoreResult.notesConnection.pageInfo,
          },
        };
      },
    });
  }

  async function handleCreateNote() {
    const newNote = await createNote();

    setCreatedNote((createdNote) => {
      if (createdNote) {
        insertNoteToNotesConnection(apolloClient.cache, createdNote);
      }
      return newNote;
    });
  }

  function handleCloseCreateNoteWidget() {
    reset();

    setCreatedNote((createdNote) => {
      if (createdNote) {
        insertNoteToNotesConnection(apolloClient.cache, createdNote);
      }
      return null;
    });
  }

  return (
    <>
      <WidgetListFabLayout
        createNoteWidgetEditor={{
          editors,
        }}
        createNoteWidget={{
          onCreate: () => {
            void handleCreateNote();
          },
          onClose: handleCloseCreateNoteWidget,
          slots: {
            toolbar: createdNote ? (
              <NoteContentIdProvider noteContentId={createdNote.contentId}>
                <ManageNoteSharingButton />
              </NoteContentIdProvider>
            ) : (
              <ManageNoteSharingButtonBase
                iconButtonProps={{
                  disabled: true,
                }}
              />
            ),
          },
        }}
        notesList={{
          loading,
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
