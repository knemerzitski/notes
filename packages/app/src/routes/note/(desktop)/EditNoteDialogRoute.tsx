import { useLocation, useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import CollabNoteEditor, {
  CollabNoteEditorProps,
} from '../../../note/components/edit/CollabNoteEditor';
import NoteDialog from '../../../note/components/NoteDialog';
import useDeleteNote from '../../../note/hooks/useDeleteNote';
import NoteTextFieldEditorsProvider, {
  NoteContentIdToEditorsProvider,
} from '../../../note/context/NoteTextFieldEditorsProvider';
import RouteSnackbarError from '../../../components/feedback/RouteSnackbarError';
import { useCreatableNoteTextFieldEditors } from '../../../note/hooks/useCreatableNoteTextFieldEditors';
import { insertNoteToNotesConnection } from '../../../note/state/update-query';
import { startTransition, useEffect, useRef } from 'react';
import { useProxyNavigate } from '../../../router/ProxyRoutesProvider';
import { useApolloClient } from '@apollo/client';

export type EditNoteLocationState = null | { newNote?: boolean; autoFocus?: boolean };

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const location = useLocation();
  const state = location.state as EditNoteLocationState;
  const noteContentId = params.id;

  const isNewNote = Boolean(state?.newNote);

  async function handleDeleteNote() {
    if (!noteContentId) return false;
    return deleteNote(noteContentId);
  }

  if (!noteContentId && !isNewNote) {
    return <RouteSnackbarError>Empty note id</RouteSnackbarError>;
  }

  return (
    <NoteDialog open={open} onClose={onClosing} onTransitionExited={onClosed}>
      {!noteContentId || isNewNote ? (
        <NewNoteCollabNoteEditor
          toolbarBoxProps={{
            onClose: onClosing,
          }}
        />
      ) : (
        <NoteContentIdToEditorsProvider noteContentId={noteContentId}>
          <CollabNoteEditor
            toolbarBoxProps={{
              onClose: onClosing,
              toolbarProps: {
                moreOptionsButtonProps: {
                  onDelete: handleDeleteNote,
                },
              },
            }}
          />
        </NoteContentIdToEditorsProvider>
      )}
    </NoteDialog>
  );
}

function noteRoute(noteId: string) {
  return `/note/${noteId}`;
}

function NewNoteCollabNoteEditor(props: CollabNoteEditorProps) {
  const apolloClient = useApolloClient();
  const navigate = useProxyNavigate();
  const { editors, createNote } = useCreatableNoteTextFieldEditors();
  const isCreatingNoteRef = useRef(false);

  useEffect(() => {
    if (isCreatingNoteRef.current) return;
    void (async () => {
      try {
        isCreatingNoteRef.current = true;
        const newNote = await createNote();
        if (!newNote) return;
        insertNoteToNotesConnection(apolloClient.cache, newNote);
        startTransition(() => {
          navigate(noteRoute(String(newNote.contentId)), {
            replace: true,
            state: {
              autoFocus: true,
            },
          });
        });
      } finally {
        isCreatingNoteRef.current = false;
      }
    })();
  }, [apolloClient, createNote, navigate]);

  return (
    <NoteTextFieldEditorsProvider textFields={editors}>
      <CollabNoteEditor {...props} />
    </NoteTextFieldEditorsProvider>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
