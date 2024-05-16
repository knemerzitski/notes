import { useLocation, useParams } from 'react-router-dom';

import NoteDialog from '../../../note/components/NoteDialog';
import useDeleteNote from '../../../note/hooks/useDeleteNote';
import NoteCollabTextsProvider from '../../../note/context/NoteTextFieldEditorsProvider';
import { useCreatableNoteTextFieldEditors } from '../../../note/hooks/useCreatableNoteTextFieldEditors';
import { startTransition, useEffect, useRef } from 'react';
import { useProxyNavigate } from '../../../router/context/ProxyRoutesProvider';
import { useApolloClient } from '@apollo/client';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../common/components/RouteClosable';
import RouteSnackbarError from '../../../common/components/RouteSnackbarError';
import CollabNoteEditor, {
  CollabNoteEditorProps,
} from '../../../note/components/CollabNoteEditor';
import { insertNoteToNotesConnection } from '../../../note/update-query';
import { NoteEditingContext } from '../../../note/context/NoteEditingContext';

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
        <NoteEditingContext noteContentId={noteContentId}>
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
        </NoteEditingContext>
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
    <NoteCollabTextsProvider editors={editors}>
      <CollabNoteEditor {...props} />
    </NoteCollabTextsProvider>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
