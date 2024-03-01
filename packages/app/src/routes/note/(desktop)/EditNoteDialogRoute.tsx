import { useSuspenseQuery } from '@apollo/client';
import { Box, Button } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';

import { Changeset } from '~op-transform/changeset/changeset';
import { CollaborativeEditor } from '~op-transform/editor/collaborative-editor';
import { SelectionDirection } from '~op-transform/editor/selection-range';

import { gql } from '../../../__generated__/gql';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import { useSnackbarError } from '../../../components/feedback/SnackbarAlertProvider';
import EditNoteDialog from '../../../components/notes/edit/EditNoteDialog';
import useDeleteNote from '../../../graphql/note/hooks/useDeleteNote';
import useUpdateNote from '../../../graphql/note/hooks/useUpdateNote';
import useControlledInputSelection from '../../../hooks/useControlledInputSelection';
import useInputValueChange from '../../../hooks/useInputValueChange';

const QUERY = gql(`
  query EditNoteDialogRoute($id: ID!) {
    note(id: $id) {
      id
      title
      content {
        text
        revision
      }
    }
  }
`);

const SUBSCRIPTION_UPDATED = gql(`
  subscription EditNoteDialogRouteNoteUpdated {
    noteUpdated {
      id
      patch {
        title
        content {
          changeset
          revision
        }
      }
    }
  }
`);

function asEditorDirection(direction: HTMLInputElement['selectionDirection']) {
  if (direction === 'forward') {
    return SelectionDirection.Forward;
  } else if (direction === 'backward') {
    return SelectionDirection.Backward;
  }
  return SelectionDirection.None;
}

function asInputDirection(direction: SelectionDirection) {
  if (direction === SelectionDirection.Forward) {
    return 'forward';
  } else if (direction === SelectionDirection.Backward) {
    return 'backward';
  }
  return 'none';
}

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();

  const params = useParams<'id'>();

  const { data, client, subscribeToMore } = useSuspenseQuery(QUERY, {
    variables: {
      id: params.id ?? '',
    },
  });

  const noteId = String(data.note.id);

  const [title, setTitle] = useState('');

  const handleTitleChanged = async (newTitle: string) => {
    setTitle(newTitle);
    await updateNote({
      id: noteId,
      patch: {
        title: newTitle,
      },
    });
  };

  // const contentInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const contentEditorRef = useRef(
    new CollaborativeEditor({
      // TODO revision as an interface
      headText: {
        revision: data.note.content.revision,
        changeset: Changeset.fromInsertion(data.note.content.text),
      },
    })
  );

  const [content, setContent] = useState<{
    value: string;
    selectionStart: number;
    selectionEnd: number;
    selectionDirection: HTMLInputElement['selectionDirection'];
  }>({
    value: contentEditorRef.current.value,
    selectionStart: contentEditorRef.current.selectionStart,
    selectionEnd: contentEditorRef.current.selectionEnd,
    selectionDirection: asInputDirection(contentEditorRef.current.selectionDirection),
  });

  const contentInputRef = useControlledInputSelection(content);

  const { onSelect: contentOnSelect, onInput: contentOnInput } = useInputValueChange({
    onInsert({ selectionStart, selectionEnd, selectionDirection, insertText }) {
      const editor = contentEditorRef.current;
      editor.setSelectionRange(
        selectionStart,
        selectionEnd,
        asEditorDirection(selectionDirection)
      );
      editor.insertText(insertText);
      updateContentStateFromEditor();
    },
    onDelete({ selectionStart, selectionEnd, selectionDirection }) {
      const editor = contentEditorRef.current;
      editor.setSelectionRange(
        selectionStart,
        selectionEnd,
        asEditorDirection(selectionDirection)
      );
      editor.deleteTextCount(1);
      updateContentStateFromEditor();
    },
    onUndo() {
      const editor = contentEditorRef.current;
      editor.undo();
      updateContentStateFromEditor();
    },
    onRedo() {
      const editor = contentEditorRef.current;
      editor.redo();
      updateContentStateFromEditor();
    },
  });

  const submitContentDebounce = useDebouncedCallback(
    async () => {
      const editor = contentEditorRef.current;

      // Prevent submitting more than once at a time
      console.log('attempting to submit changes');
      if (editor.haveSubmittedChanges()) return;

      const changes = editor.submitChanges();

      console.log('submitting changes:', changes.revision, changes.changeset.toString());
      const contentResult = await updateNote({
        id: noteId,
        patch: {
          content: {
            targetRevision: changes.revision,
            // TODO revisionchangeset as interface
            changeset: changes.changeset.serialize(), // TODO changeset type, add scalar in app from api
          },
        },
      });

      // TODO guarantee response revision?
      const revision = contentResult?.patch?.content?.revision;
      if (!revision) {
        showError('Unexpected content submission result empty revision');
        return;
      }

      console.log('changes acknowledged', revision);
      editor.submittedChangesAcknowledged(revision);

      if (editor.haveLocalChanges()) {
        console.log('have local changes, debouncing...');
        void submitContentDebounce();
      }
    }
    // TODO add debounce delay
    // 250,
    // { maxWait: 500 }
  );

  const updateContentStateFromEditor = useCallback(
    (skipDebounce = false) => {
      const editor = contentEditorRef.current;
      setContent({
        value: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd,
        selectionDirection: asInputDirection(editor.selectionDirection),
      });
      if (!skipDebounce && !editor.haveSubmittedChanges()) {
        void submitContentDebounce();
      }
    },
    [submitContentDebounce]
  );

  useEffect(() => {
    subscribeToMore({
      document: SUBSCRIPTION_UPDATED,
      updateQuery(existing, { subscriptionData }) {
        // const existingNote = existing.note;
        const noteUpdate = subscriptionData.data.noteUpdated;
        console.log('received external change', noteUpdate.patch.content?.revision);

        if (noteUpdate.patch.title) {
          setTitle(noteUpdate.patch.title);
        }

        if (noteUpdate.patch.content) {
          const editor = contentEditorRef.current;
          const patchContent = noteUpdate.patch.content;
          if (editor.documentRevision < patchContent.revision) {
            const inputEl = contentInputRef.current;
            if (inputEl) {
              // Sync input selection to editor selection before processing external change
              editor.setSelectionRange(
                inputEl.selectionStart ?? editor.selectionStart,
                inputEl.selectionEnd ?? editor.selectionEnd,
                asEditorDirection(inputEl.selectionDirection)
              );
            }
            editor.handleExternalChange({
              revision: patchContent.revision,
              changeset: Changeset.parseValue(patchContent.changeset),
            });
            updateContentStateFromEditor(true);
          }
        }

        // TODO update cache too
        // const updatedNote = {
        //   ...existingNote,
        //   title: noteUpdate.patch.title ?? existingNote.title,
        //   textContent: noteUpdate.patch.textContent ?? existingNote.textContent,
        // };
        // setNote({
        //   title: noteUpdate.patch.title ?? note.title,
        //   content: noteUpdate.patch.textContent ?? note.content,
        // });

        // return {
        //   note: updatedNote,
        // };
        return existing;
      },
    });
  }, [subscribeToMore, updateContentStateFromEditor, contentInputRef]);

  function handleDeleteNote() {
    return deleteNote(noteId);
  }

  function handleClosed() {
    client.cache.writeFragment({
      id: client.cache.identify({ id: noteId, __typename: 'Note' }),
      fragment: gql(`
        fragment EditNoteDialogRouteUpdateNote on Note {
          title
          content {
            revision
            text
          }
        }
      `),
      data: {
        title,
        content: {
          // TODO local changes save too?
          revision: contentEditorRef.current.documentRevision,
          text: contentEditorRef.current.documentServer.joinInsertions(),
        },
      },
    });
    onClosed();
  }

  return (
    <EditNoteDialog
      slotProps={{
        dialog: {
          open,
          onClose: onClosing,
          onTransitionExited: handleClosed,
        },
        editor: {
          onClose: onClosing,
          onDelete: handleDeleteNote,
          titleFieldProps: {
            value: title,
            onChange: (e) => {
              void handleTitleChanged(String(e.target.value));
            },
          },
          contentFieldProps: {
            inputRef: contentInputRef,
            value: content.value,
            onSelect: contentOnSelect,
            onInput: contentOnInput,
          },
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Button
          onClick={() => {
            const editor = contentEditorRef.current;
            console.log(editor);
          }}
        >
          log editor
        </Button>
      </Box>
    </EditNoteDialog>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
